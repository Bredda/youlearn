#!/usr/bin/env bash
# Keeps the GitHub Project (YouLearn, Bredda/projects/8) and the issues consistent. Only needs `gh` (no jq).
#
#   tracking.sh status <issue> <Backlog|Next|"In progress"|"In review"|Done>
#   tracking.sh new "<title>" "<label,label>" <status> [parent-issue]     (body on stdin)
#   tracking.sh sub <parent-issue> <child-issue>
#   tracking.sh audit [--fix]
set -euo pipefail

OWNER=Bredda
PROJECT=8
REPO=Bredda/youlearn
STATUSES=("Backlog" "Next" "In progress" "In review" "Done")

valid_status() {
	local s
	for s in "${STATUSES[@]}"; do [ "$s" = "$1" ] && return 0; done
	echo "Unknown status '$1' (one of: ${STATUSES[*]})" >&2
	return 1
}

set_status() { # issue status
	valid_status "$2"
	gh project item-edit "$PROJECT" --owner "$OWNER" --url "https://github.com/$REPO/issues/$1" \
		--field Status --value "$2" >/dev/null
	echo "#$1 -> $2"
}

link_sub() { # parent child
	local child_id
	child_id=$(gh api "repos/$REPO/issues/$2" --jq .id)
	gh api "repos/$REPO/issues/$1/sub_issues" -F sub_issue_id="$child_id" --silent
	echo "#$2 is now a sub-issue of #$1"
}

new_issue() { # title labels status [parent]; body on stdin
	valid_status "$3"
	local url number
	url=$(gh issue create -R "$REPO" --title "$1" --label "$2" --body-file -)
	number=${url##*/}
	gh project item-add "$PROJECT" --owner "$OWNER" --url "$url" >/dev/null
	set_status "$number" "$3" >/dev/null
	if [ -n "${4:-}" ]; then link_sub "$4" "$number" >/dev/null; fi
	echo "#$number $url ($3${4:+, child of #$4})"
}

audit() {
	local fix=0 problems=0
	[ "${1:-}" = "--fix" ] && fix=1
	local tmp; tmp=$(mktemp -d); trap 'rm -rf "$tmp"' RETURN

	# One GraphQL read for the Project; the rest goes through REST, which has its own, larger budget (the GraphQL one
	# of 5000 points an hour is shared with every `gh issue` / `gh pr` command).
	gh project item-list "$PROJECT" --owner "$OWNER" --limit 500 --format json \
		--jq '.items[] | select(.content.type=="Issue") | "\(.content.number)|\(.status // "-")"' >"$tmp/status.txt"
	# number|STATE|labels|unticked boxes|ticked boxes|sub-issues total|sub-issues done|title
	gh api "repos/$REPO/issues?state=all&per_page=100" --paginate \
		--jq '.[] | select(.pull_request | not) | "\(.number)|\(.state | ascii_upcase)|\([.labels[].name] | join(","))|\((.body // "") | [scan("- \\[ \\]")] | length)|\((.body // "") | [scan("- \\[x\\]")] | length)|\(.sub_issues_summary.total // 0)|\(.sub_issues_summary.completed // 0)|\(.title)"' >"$tmp/issues.txt"
	# Open pull requests with the issues they close or refer to.
	gh api "repos/$REPO/pulls?state=open&per_page=100" \
		--jq '.[] | "\(.number)|\([(.body // "") | match("(?i)(closes|fixes|resolves|refs) #([0-9]+)"; "g") | .captures | "\(.[0].string | ascii_downcase)=\(.[1].string)"] | join(" "))"' >"$tmp/prs.txt"

	declare -A status state labels title boxes_open boxes_done subs_total subs_done closing
	while IFS='|' read -r n s; do status[$n]=$s; done <"$tmp/status.txt"
	while IFS='|' read -r n st l bo bd stt sd t; do
		state[$n]=$st; labels[$n]=$l; boxes_open[$n]=$bo; boxes_done[$n]=$bd
		subs_total[$n]=$stt; subs_done[$n]=$sd; title[$n]=$t
	done <"$tmp/issues.txt"
	while IFS='|' read -r pr refs; do
		for ref in $refs; do
			# `Refs` leaves the issue alone (a phase of a plan); only what a PR closes is In review while it is open.
			[ "${ref%%=*}" = refs ] || closing[${ref##*=}]="${closing[${ref##*=}]:-} #$pr"
		done
	done <"$tmp/prs.txt"

	report() { problems=$((problems + 1)); echo "- $*"; }

	local n s st
	for n in "${!state[@]}"; do
		if [ -z "${status[$n]:-}" ]; then
			case ",${labels[$n]}," in
			*,documentation,*) ;; # the vision issue lives outside the Project on purpose
			*) report "#$n is not in the Project: ${title[$n]}" ;;
			esac
			continue
		fi
		s=${status[$n]}; st=${state[$n]}
		if [ "$st" = CLOSED ] && [ "$s" != Done ]; then
			if [ $fix = 1 ]; then set_status "$n" Done >/dev/null; report "#$n was closed but '$s': set to Done"
			else report "#$n is closed but its status is '$s' (should be Done)"; fi
		elif [ "$st" = OPEN ] && [ "$s" = Done ]; then
			report "#$n is open but its status is Done: reopen it or close it"
		elif [ "$st" = OPEN ] && [ -n "${closing[$n]:-}" ] && [ "$s" != "In review" ]; then
			if [ $fix = 1 ]; then set_status "$n" "In review" >/dev/null; report "#$n has an open PR that closes it (${closing[$n]# }): set to In review (was '$s')"
			else report "#$n has an open PR that closes it (${closing[$n]# }) but its status is '$s' (should be In review)"; fi
		elif [ "$st" = OPEN ] && [ "$s" = "In review" ] && [ -z "${closing[$n]:-}" ]; then
			report "#$n is In review but no open PR closes it: back to In progress, or is Closes missing in the PR body?"
		fi
	done

	# Epics whose sub-issues are all done, and plans whose boxes are all ticked, are ready to close.
	for n in "${!state[@]}"; do
		[ "${state[$n]}" = OPEN ] || continue
		case ",${labels[$n]}," in
		*,epic,*)
			if [ "${subs_total[$n]}" -gt 0 ] && [ "${subs_total[$n]}" = "${subs_done[$n]}" ]; then
				report "#$n (epic) has all ${subs_total[$n]} sub-issues done: close it, then set it to Done"
			fi ;;
		*,plan,*)
			if [ "${boxes_open[$n]}" = 0 ] && [ "${boxes_done[$n]}" -gt 0 ]; then
				report "#$n (plan) has every box ticked: close it (and check its epic)"
			fi ;;
		esac
	done

	if [ $problems = 0 ]; then echo "Project and issues are consistent."; else echo "$problems finding(s)."; fi
	echo "In progress now:"
	for n in "${!status[@]}"; do
		if [ "${status[$n]}" = "In progress" ] && [ "${state[$n]:-}" = OPEN ]; then echo "  #$n ${title[$n]}"; fi
	done | sort
	return 0
}

case "${1:-}" in
status) set_status "${2:?issue}" "${3:?status}" ;;
new) new_issue "${2:?title}" "${3:?labels}" "${4:?status}" "${5:-}" ;;
sub) link_sub "${2:?parent}" "${3:?child}" ;;
audit) audit "${2:-}" ;;
*) sed -n '2,8p' "$0" >&2; exit 2 ;;
esac
