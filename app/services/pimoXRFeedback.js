export const PIMO_XR_FEEDBACK = Object.freeze({
    tap: { strength: .25, duration: 18, notes: [660], time: .07 },
    grab: { strength: .45, duration: 34, notes: [240, 360], time: .1 },
    place: { strength: .6, duration: 55, notes: [440, 660], time: .14 },
    snap: { strength: .65, duration: 65, notes: [520, 780, 1040], time: .17 },
    grow: { strength: .9, duration: 110, notes: [392, 588, 784], time: .24 },
    connect: { strength: .85, duration: 95, notes: [440, 554, 880], time: .22 },
    error: { strength: .25, duration: 45, notes: [180, 150], time: .11 }
});

// Generated soft tones require no downloads. Haptics stay enabled when sound is muted.
export function createPimoXRFeedback({ createAudio = () => new (window.AudioContext || window.webkitAudioContext)() } = {}) {
    let context, enabled = true, disposed = false;
    const counts = {};
    function play(kind = 'tap', inputSource) {
        if (disposed) return;
        const pattern = PIMO_XR_FEEDBACK[kind] || PIMO_XR_FEEDBACK.tap; counts[kind] = (counts[kind] || 0) + 1;
        const gamepad = inputSource?.gamepad, actuator = gamepad?.hapticActuators?.[0] || gamepad?.vibrationActuator;
        try {
            const pending = actuator?.pulse ? actuator.pulse(pattern.strength, pattern.duration) : actuator?.playEffect?.('dual-rumble', { duration: pattern.duration, strongMagnitude: pattern.strength, weakMagnitude: pattern.strength * .5 });
            if (pending) void Promise.resolve(pending).catch(() => {});
        } catch { /* Hands have no vibration motor; visual and audio cues still apply. */ }
        if (!enabled) return;
        try {
            context ||= createAudio(); if (context.state === 'suspended') void Promise.resolve(context.resume()).catch(() => {});
            const now = context.currentTime, step = pattern.time / pattern.notes.length;
            pattern.notes.forEach((frequency, i) => {
                const osc = context.createOscillator(), gain = context.createGain(), start = now + i * step;
                osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, start); gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(.038 / Math.sqrt(pattern.notes.length), start + .009); gain.gain.exponentialRampToValueAtTime(.0001, start + .13);
                osc.connect(gain).connect(context.destination); osc.start(start); osc.stop(start + .15);
            });
        } catch { /* Audio support must never interrupt a grab or save. */ }
    }
    return { play, setEnabled(value) { enabled = !!value; }, get enabled() { return enabled; }, get counts() { return { ...counts }; }, destroy() { disposed = true; if (context) void Promise.resolve(context.close()).catch(() => {}); } };
}
