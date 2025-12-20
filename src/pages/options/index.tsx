import React from 'react';
import { createRoot } from 'react-dom/client';
import Options from '@pages/options/Options';
import { useTheme } from '@src/hooks/useTheme';
import '@assets/styles/tailwind.css';


function OptionsWrapper() {
  useTheme();
  return <Options />;
}

function init() {
  const rootContainer = document.querySelector("#__root");
  if (!rootContainer) throw new Error("Can't find Options root element");
  const root = createRoot(rootContainer);
  root.render(<OptionsWrapper />);
}

init();
