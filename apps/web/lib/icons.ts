import {
	Add01Icon,
	AiLearningIcon,
	Alert01Icon,
	Archive02Icon,
	ArrowDown01Icon,
	ArrowLeft01Icon,
	ArrowLeftDoubleIcon,
	ArrowRight01Icon,
	ArrowRightDoubleIcon,
	ArrowUp01Icon,
	ArrowUpRight01Icon,
	Audit01Icon,
	BookOpen01Icon,
	Cancel01Icon,
	CodeIcon,
	Copy01Icon,
	CourseIcon,
	CrowdfundingIcon,
	Delete02Icon,
	DragDropVerticalIcon,
	Edit02Icon,
	ElearningExchangeIcon,
	Eye,
	EyeOff,
	File01Icon,
	FileSearchIcon,
	FloppyDiskIcon,
	GitCompareIcon,
	Heading01Icon,
	HelpCircleIcon,
	Image01Icon,
	LeftToRightListBulletIcon,
	Link01Icon,
	LockIcon,
	LockPasswordIcon,
	Login01Icon,
	LogoutIcon,
	Moon02Icon,
	MoreHorizontalIcon,
	NotificationIcon,
	QuoteDownIcon,
	Refresh01Icon,
	Rocket01Icon,
	RotateLeft01Icon,
	SchoolIcon,
	Search01Icon,
	Sun03Icon,
	TextBoldIcon,
	TextIcon,
	TextItalicIcon,
	Tick02Icon,
	UndoIcon,
	UnfoldMoreIcon,
	Upload01Icon,
	UserBlock01Icon,
	UserCheck01Icon,
	UserCircleIcon,
	UsersIcon,
	Video01Icon,
	ViewIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgObject } from "@/lib/types";

/**
 * Every icon of the app, by what it means. Pages ask for a name (`<Icon name="delete" />`), never for a glyph,
 * so the same action looks the same everywhere and a glyph is changed in one place.
 * Outside `components/ui` (shadcn), do not import `@hugeicons/*` icons directly: add the name here.
 */
export const icons = {
	// Actions
	add: Add01Icon,
	edit: Edit02Icon,
	delete: Delete02Icon,
	/** Go to the page of an item. */
	open: ArrowUpRight01Icon,
	/** Look at something read-only. */
	view: ViewIcon,
	save: FloppyDiskIcon,
	confirm: Tick02Icon,
	cancel: Cancel01Icon,
	refresh: Refresh01Icon,
	search: Search01Icon,
	reset: RotateLeft01Icon,
	copy: Copy01Icon,
	copied: Tick02Icon,
	link: Link01Icon,
	upload: Upload01Icon,
	image: Image01Icon,
	more: MoreHorizontalIcon,
	moveUp: ArrowUp01Icon,
	moveDown: ArrowDown01Icon,
	show: Eye,
	hide: EyeOff,

	// Course content
	chapter: BookOpen01Icon,
	/** A text (markdown) block of a chapter. */
	textBlock: TextIcon,
	videoBlock: Video01Icon,
	quiz: HelpCircleIcon,
	/** A blocking quiz keeps the next chapter locked. */
	blocking: LockIcon,
	/** Handle to drag an item to another position. */
	dragHandle: DragDropVerticalIcon,
	/** Compare two revisions. */
	compare: GitCompareIcon,

	// Markdown editor toolbar
	bold: TextBoldIcon,
	italic: TextItalicIcon,
	heading: Heading01Icon,
	inlineCode: CodeIcon,
	list: LeftToRightListBulletIcon,
	quote: QuoteDownIcon,

	// Revision workflow
	draft: File01Icon,
	preview: FileSearchIcon,
	publish: Rocket01Icon,
	deprecate: Archive02Icon,
	/** Copy a revision into a new draft. */
	clone: Copy01Icon,
	/** Bring a revision back to the draft state. */
	toDraft: UndoIcon,

	// Account
	ban: UserBlock01Icon,
	unban: UserCheck01Icon,
	password: LockPasswordIcon,
	signIn: Login01Icon,
	signOut: LogoutIcon,
	profile: UserCircleIcon,
	notifications: NotificationIcon,
	themeLight: Sun03Icon,
	themeDark: Moon02Icon,

	// Feedback
	alert: Alert01Icon,

	// Tables
	sortAscending: ArrowUp01Icon,
	sortDescending: ArrowDown01Icon,
	sortable: UnfoldMoreIcon,
	expand: UnfoldMoreIcon,
	firstPage: ArrowLeftDoubleIcon,
	previousPage: ArrowLeft01Icon,
	nextPage: ArrowRight01Icon,
	lastPage: ArrowRightDoubleIcon,

	// What the app is about (navigation, headings)
	brand: AiLearningIcon,
	dashboard: UsersIcon,
	sessions: CourseIcon,
	programs: SchoolIcon,
	courses: ElearningExchangeIcon,
	groups: CrowdfundingIcon,
	users: UsersIcon,
	events: Audit01Icon,
} as const satisfies Record<string, IconSvgObject>;

export type IconName = keyof typeof icons;
