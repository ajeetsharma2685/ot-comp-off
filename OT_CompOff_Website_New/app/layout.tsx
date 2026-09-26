import type { Metadata } from "next"; import "./globals.css";
export const metadata: Metadata={title:"OT & Comp-Off",description:"Staff OT and Comp-Off management"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}