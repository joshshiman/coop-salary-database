import { ThemeProvider } from "../context/ThemeContext";
import "../styles/globals.css";
import { Inter } from "next/font/google";
import Head from "next/head";
import Script from "next/script";

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ["latin"] });

export default function MyApp({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <main className={inter.className}>
        <Head>
          <link
            href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
            rel="stylesheet"
            integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN"
            crossOrigin="anonymous"
          />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="true"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap"
            rel="stylesheet"
          />
        </Head>
        <Component {...pageProps} />
        <Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
          crossOrigin="anonymous"
        />
      </main>
    </ThemeProvider>
  );
}
