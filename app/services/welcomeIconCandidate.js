// Candidate only: shared SVG paths make a reviewable set without changing the
// current wrist controls before visual approval.
export const WRIST_ICON_CANDIDATE=Object.freeze({
 settings:{label:'Settings',path:'M4 7h16M4 17h16M8 4v6M16 14v6'},
 audio:{label:'Audio',path:'M4 9h4l5-4v14l-5-4H4zM16 8c3 2 3 6 0 8M19 5c5 4 5 10 0 14'},
 controller:{label:'Controllers',path:'M17 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0zM8 10l1 10c0 3 6 3 6 0l1-10M10 7h.01M14 8h.01M11 14h2'},
 hand:{label:'Hands',path:'M7 12V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v6c0 5-3 7-7 7-3 0-4-2-6-5l-2-3c-1-2 1-3 3-1l1 1'},
 lesson:{label:'Tutorial',path:'M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1v14M6 9h3M15 9h3M6 12h3M15 12h3'},
 repeat:{label:'Repeat',path:'M4 10a8 8 0 1 1 1 8M4 4v6h6'},
 games:{label:'Games',path:'M8 7h8c3 0 4 3 5 8s-2 6-5 1H8c-3 5-6 4-5-1s2-8 5-8zM6 11h5M8.5 8.5v5M16 11h.01M18 13h.01'},
 mic:{label:'Microphone',path:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0zM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8'},
 pause:{label:'Pause',path:'M7 5h3v14H7zM14 5h3v14h-3z'},
 play:{label:'Play',path:'M8 4l12 8-12 8z'},
 brush:{label:'Brush',path:'M9 14L18 3l3 3-11 9M9 14c-4-2-5 1-5 3 0 2-2 3-2 3s8 2 9-3z'},
 undo:{label:'Undo',path:'M9 5l-6 6 6 6M3 11h10c5 0 7 3 7 8'},
 eraser:{label:'Eraser',path:'M3 13L13 3l8 8-10 10H7zM7 9l8 8M11 21h10'},
 colour:{label:'Colours',path:'M12 3a9 9 0 1 0 0 18h2c3 0 3-4 1-5s-1-3 1-3h2c5 0 3-10-6-10zM7 8h.01M12 6h.01M17 8h.01M6 13h.01'},
 close:{label:'Close',path:'M6 6l12 12M18 6L6 18'}
});
export function candidateIconSvg(id){const icon=WRIST_ICON_CANDIDATE[id];return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icon.path}"/></svg>`;}
