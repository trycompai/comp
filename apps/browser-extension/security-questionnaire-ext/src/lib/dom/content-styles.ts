export const contentStyles = `
[data-comp-sq-root="true"] {
  all: initial;
}

.comp-sq-flash {
  animation: comp-sq-flash 900ms ease-out;
  outline: 2px solid #00dc73;
  outline-offset: 2px;
}

@keyframes comp-sq-flash {
  0% { box-shadow: 0 0 0 0 rgb(0 220 115 / 38%); }
  100% { box-shadow: 0 0 0 12px rgb(0 220 115 / 0%); }
}
`;
