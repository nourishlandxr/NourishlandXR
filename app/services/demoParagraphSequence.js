export function createDemoParagraphSequence({
    paragraphs,
    readingTime,
    fadeInMs = 1100,
    fadeOutMs = 700,
    reducedMotion = false,
    now = () => performance.now(),
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    onChange = () => {},
    onComplete = () => {}
}) {
    const items = [...paragraphs];
    const inDuration = reducedMotion ? 0 : Math.max(0, fadeInMs);
    const outDuration = reducedMotion ? 0 : Math.max(0, fadeOutMs);
    let index = -1;
    let phase = 'idle';
    let phaseStartedAt = 0;
    let timer = null;
    let cancelled = false;
    let completed = false;

    const publish = nextPhase => {
        phase = nextPhase;
        phaseStartedAt = now();
        onChange({index, paragraph: items[index] || '', phase, startedAt: phaseStartedAt});
    };
    const schedule = (delay, callback) => {
        timer = setTimer(() => {
            timer = null;
            if (!cancelled) callback();
        }, delay);
    };
    const showNext = () => {
        index++;
        if (index >= items.length) {
            completed = true;
            phase = 'complete';
            onComplete();
            return;
        }
        if (inDuration) {
            publish('fade-in');
            schedule(inDuration, beginReading);
        } else beginReading();
    };
    const beginReading = () => {
        publish('reading');
        schedule(Math.max(0, readingTime(items[index])), beginFadeOut);
    };
    const beginFadeOut = () => {
        if (index === items.length - 1) {
            completed = true;
            phase = 'complete';
            onComplete();
            return;
        }
        if (!outDuration) {
            showNext();
            return;
        }
        publish('fade-out');
        schedule(outDuration, showNext);
    };

    return {
        start() {
            if (cancelled || index !== -1 || !items.length) return;
            showNext();
        },
        cancel() {
            if (cancelled) return;
            cancelled = true;
            if (timer !== null) clearTimer(timer);
            timer = null;
        },
        snapshot(at = now()) {
            let opacity = 1;
            if (phase === 'fade-in') opacity = inDuration ? Math.min(1, Math.max(0, (at - phaseStartedAt) / inDuration)) : 1;
            else if (phase === 'fade-out') opacity = outDuration ? 1 - Math.min(1, Math.max(0, (at - phaseStartedAt) / outDuration)) : 0;
            return {index, paragraph: items[index] || '', phase, startedAt: phaseStartedAt, opacity, active: !cancelled && !completed, completed, cancelled};
        }
    };
}
