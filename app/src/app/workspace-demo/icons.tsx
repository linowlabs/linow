import React from "react";

export const Icons = {
  Robot: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  ),
  Chain: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z" />
    </svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  ),
  ChevronDown: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  ChevronUp: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  ),
  ChevronLeft: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  ChevronRight: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  ChevronRightTiny: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  ChevronDownTiny: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  FolderClosed: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="folderClosedBack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2b047" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#c2912b" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="folderClosedFront" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
          <stop offset="100%" stopColor="rgba(245, 230, 200, 0.5)" />
        </linearGradient>
      </defs>
      <path d="M2 5a2 2 0 0 1 2-2h4.5c.82 0 1.58.4 2.05 1.07L12.5 7H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="url(#folderClosedBack)" />
      <path d="M2 8.5h20V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.5z" fill="url(#folderClosedFront)" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="1.2" />
      <line x1="5" y1="12" x2="11" y2="12" stroke="rgba(194, 145, 43, 0.4)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="15" x2="9" y2="15" stroke="rgba(194, 145, 43, 0.3)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  FolderOpen: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="folderOpenBack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2b047" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#c2912b" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="folderOpenFront" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
          <stop offset="100%" stopColor="rgba(245, 230, 200, 0.6)" />
        </linearGradient>
      </defs>
      <path d="M2 5a2 2 0 0 1 2-2h4.5c.82 0 1.58.4 2.05 1.07L12.5 7H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" fill="url(#folderOpenBack)" />
      <path d="M1.5 9.5h21L20 21H4L1.5 9.5z" fill="url(#folderOpenFront)" stroke="rgba(255, 255, 255, 0.95)" strokeWidth="1.2" />
      <path d="M6 6h8v6H6V6z" fill="rgba(255, 255, 255, 0.9)" stroke="rgba(0, 0, 0, 0.05)" strokeWidth="0.5" transform="rotate(-5 10 9)" />
    </svg>
  ),
  FilePdf: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ color: "#e05e5e" }}>
      <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
      <path d="M4.5 8h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1zm0 2h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1zm0 2h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1z" />
    </svg>
  ),
  FileExcel: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ color: "#3fa76a" }}>
      <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
      <path d="M5.5 6h5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5zM5 8v1h2V8H5zm3 0v1h2V8H8zm-3-1v.5h2V7H5zm3 0v.5h2V7H8z" />
    </svg>
  ),
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  ),
  Check: ({ className = "", size = 16 }: { className?: string; size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  Send: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  ),
  Sparkles: ({ className = "", size = 20, style }: { className?: string; size?: number; style?: React.CSSProperties }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M11 3Q11 10 4 10Q11 10 11 17Q11 10 18 10Q11 10 11 3Z" />
      <path d="M17 1Q17 5 13 5Q17 5 17 9Q17 5 21 5Q17 5 17 1Z" />
      <path d="M18 10Q18 14 14 14Q18 14 18 18Q18 14 22 14Q18 14 18 10Z" />
      <path d="M6 4Q6 7 3 7Q6 7 6 10Q6 7 9 7Q6 7 6 4Z" />
    </svg>
  ),
  BoxChain: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="6" x2="6" y2="12" />
      <line x1="12" y1="6" x2="18" y2="12" />
      <line x1="12" y1="18" x2="6" y2="12" />
      <line x1="12" y1="18" x2="18" y2="12" />
      <path d="M 12 3 L 15 4.5 L 12 6 L 9 4.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 9 4.5 L 12 6 L 12 9 L 9 7.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 15 4.5 L 12 6 L 12 9 L 15 7.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 6 9 L 9 10.5 L 6 12 L 3 10.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 3 10.5 L 6 12 L 6 15 L 3 13.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 9 10.5 L 6 12 L 6 15 L 9 13.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 18 9 L 21 10.5 L 18 12 L 15 10.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 15 10.5 L 18 12 L 18 15 L 15 13.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 21 10.5 L 18 12 L 18 15 L 21 13.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 12 15 L 15 16.5 L 12 18 L 9 16.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 9 16.5 L 12 18 L 12 21 L 9 19.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 15 16.5 L 12 18 L 12 21 L 15 19.5 Z" fill="#ffffff" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  ShieldCheck: ({ className = "" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 11 2 2 4-4" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Upload: ({ className = "", size = 20 }: { className?: string; size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Download: ({ className = "", size = 20 }: { className?: string; size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  X: ({ className = "", size = 16 }: { className?: string; size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  NewFile: ({ className = "", size = 15 }: { className?: string; size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M12 12v6" />
      <path d="M9 15h6" />
    </svg>
  ),
  NewFolder: ({ className = "", size = 15 }: { className?: string; size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M12 10v6" />
      <path d="M9 13h6" />
    </svg>
  ),
  Trash: ({ className = "", size = 12 }: { className?: string; size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
};
