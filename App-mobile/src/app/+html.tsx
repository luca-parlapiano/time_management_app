import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { ReactNode } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();
  return (
    <html lang="it" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Mantiene centrata l'anteprima mobile nel browser desktop. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {headNodes}
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body {...bodyAttributes}>{children}{bodyNodes}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #e8eee7;
}
#root {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background-color: #fbfaf4;
  box-shadow: 0 0 36px rgba(30, 56, 44, 0.12);
}
@media (max-width: 480px) {
  #root {
    box-shadow: none;
  }
}`;
