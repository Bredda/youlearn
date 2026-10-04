"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

type Reading = { reached: boolean; markReached: () => void };

const ReadingContext = createContext<Reading>({
	reached: true,
	markReached: () => undefined,
});

/** True once the learner has scrolled to the end of the chapter content (always true when nothing is required). */
export function useReadingReached() {
	return useContext(ReadingContext).reached;
}

/**
 * Holds whether the end of the chapter content has been seen: the buttons that move the learner forward read it
 * and stay disabled until then. It is a nudge, not a lock (the chapter list still links anywhere that is open),
 * and it only latches: scrolling back up does not disable the buttons again. Mount it with a `key` per chapter and
 * put a `ReadingEnd` right after the content.
 */
export function ReadingGate({
	required,
	children,
}: {
	/** False when there is nothing to read first (chapter already completed, finished enrollment, locked chapter). */
	required: boolean;
	children: ReactNode;
}) {
	const [seen, setSeen] = useState(false);
	const value = useMemo(
		() => ({ reached: !required || seen, markReached: () => setSeen(true) }),
		[required, seen],
	);
	return <ReadingContext value={value}>{children}</ReadingContext>;
}

/** Marker to put right after the content: it reports to the gate once it enters the viewport. */
export function ReadingEnd() {
	const { markReached } = useContext(ReadingContext);
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		const observer = new IntersectionObserver(([entry]) => {
			if (entry?.isIntersecting) {
				markReached();
				observer.disconnect();
			}
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [markReached]);
	return <div ref={ref} aria-hidden className="h-px" />;
}
