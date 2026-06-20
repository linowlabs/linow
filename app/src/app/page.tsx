"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import "./landing.css";

const benefitsNodes = [
  {
    id: 0,
    role: "company" as const,
    title: "Automated Evidence Preparation",
    shortDesc: "Classify and prep compliance archives.",
    detail: "Linow's browser co-auditor runs automated document classification, maps local client files to standard regulatory assertions, and highlights potential coverage gaps before auditor review.",
    label: "Auto-Prep",
    x: 30,
    y: 23,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    )
  },
  {
    id: 1,
    role: "company" as const,
    title: "Zero-Knowledge Local Commitments",
    shortDesc: "Generate cryptographic proofs in the browser.",
    detail: "Files are hashed locally in the user's browser. Only the secure SHA-256 hash commitment is registered on-chain, preserving complete client confidentiality and zero-trust verification.",
    label: "Local Hash",
    x: 18,
    y: 50,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.599-3.75A11.902 11.902 0 0112 5.715z" />
      </svg>
    )
  },
  {
    id: 2,
    role: "company" as const,
    title: "Real-Time Readiness Gaps",
    shortDesc: "Identify compliance issues instantly.",
    detail: "Track assertion completeness and compliance scores dynamically. Instantly identify missing documents, signature gaps, or mismatching records before finalizing ledger entries.",
    label: "Readiness Gaps",
    x: 30,
    y: 77,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 18.375v-5.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-9.75zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    )
  },
  {
    id: 3,
    role: "auditor" as const,
    title: "One-Click Evidence Verification",
    shortDesc: "Authenticate file signatures instantly.",
    detail: "Compare evidence hashes directly against immutable Sui ledger anchors. Instantly verify that client documents match the registered commitments, blocking all tampering attempts.",
    label: "Verification",
    x: 70,
    y: 23,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
      </svg>
    )
  },
  {
    id: 4,
    role: "auditor" as const,
    title: "Wallet-Backed Attestations",
    shortDesc: "Sign immutable review results.",
    detail: "Log wallet-authorized reviewer signatures directly on Sui. Link verified evidence objects to formal audit findings, forming a durable, legally-robust attest chain.",
    label: "Attestations",
    x: 82,
    y: 50,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    )
  },
  {
    id: 5,
    role: "auditor" as const,
    title: "Verifiable Audit History",
    shortDesc: "Replay agent reasoning step-by-step.",
    detail: "Access a completely transparent timeline of AI classifications, file state commits, and human reviewer approvals. Full traceability ensures frictionless audit inspections.",
    label: "Audit Trail",
    x: 70,
    y: 77,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    )
  }
];

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyTrackRef = useRef<HTMLDivElement>(null);
  
  // Pipeline column refs
  const pcolPrepRef = useRef<HTMLDivElement>(null);
  const pcolStorageRef = useRef<HTMLDivElement>(null);
  const pcolRegistryRef = useRef<HTMLDivElement>(null);
  const pcolReviewRef = useRef<HTMLDivElement>(null);
  
  // Pipeline card refs for animation
  const pcardUploadRef = useRef<HTMLDivElement>(null);
  const pcardHashRef = useRef<HTMLDivElement>(null);
  const pcardEncryptRef = useRef<HTMLDivElement>(null);
  const pcardWalrusRef = useRef<HTMLDivElement>(null);
  const pcardSuiRef = useRef<HTMLDivElement>(null);
  const pcardVerifyRef = useRef<HTMLDivElement>(null);
  const pcardAttestRef = useRef<HTMLDivElement>(null);
  
  const introExplanationRef = useRef<HTMLDivElement>(null);
  
  // Card elements references for explanations
  const cardRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  // We can track scroll state to handle navbar styling transitions
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [simPhase, setSimPhase] = useState(0);

  // Hexagonal Trust Web states
  const [activeRole, setActiveRole] = useState<'company' | 'auditor'>('company');
  const [activeNodeIndex, setActiveNodeIndex] = useState<number>(0);
  
  // Agent loop delay state
  const [isPending, setIsPending] = useState(true);

  const chatViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoaded(true);
    
    // Initial run to lay out elements correctly
    handleScroll();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSimPhase((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatViewportRef.current) {
      chatViewportRef.current.scrollTo({
        top: chatViewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [simPhase]);

  useEffect(() => {
    setIsPending(true);
    const timer = setTimeout(() => {
      setIsPending(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [simPhase]);

  // Hexagon trust web auto-looping effect (cycles benefits within the currently active role)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNodeIndex((prev) => {
        if (activeRole === 'company') {
          return (prev + 1) % 3;
        } else {
          const currentOffset = prev - 3;
          const nextOffset = (currentOffset + 1) % 3;
          return 3 + nextOffset;
        }
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [activeRole]);

  const handleScroll = () => {
    if (!containerRef.current || !stickyTrackRef.current) return;

    const scrollTop = containerRef.current.scrollTop;
    setIsScrolled(scrollTop > 50);

    const clientHeight = containerRef.current.clientHeight;

    const stickyTrack = stickyTrackRef.current;
    const stickyTop = stickyTrack.offsetTop;
    const stickyHeight = stickyTrack.offsetHeight;

    // Local progress of the sticky section (0 to 1)
    const stickyScrollRange = stickyHeight - clientHeight;
    let localProgress = 0;
    if (stickyScrollRange > 0) {
      localProgress = (scrollTop - stickyTop) / stickyScrollRange;
    }
    
    // Clamp progress
    localProgress = Math.max(0, Math.min(1, localProgress));

    requestAnimationFrame(() => {
      animatePipeline(localProgress);
      animateExplanations(localProgress);
    });
  };

  const animatePipeline = (progress: number) => {
    const showIntro = progress < 0.08;

    // 4 Columns matching 4 steps/scroll ranges
    const cols = [
      { ref: pcolPrepRef.current, start: 0.08, end: 0.31, cards: [pcardUploadRef, pcardHashRef] },
      { ref: pcolStorageRef.current, start: 0.31, end: 0.54, cards: [pcardEncryptRef, pcardWalrusRef] },
      { ref: pcolRegistryRef.current, start: 0.54, end: 0.77, cards: [pcardSuiRef] },
      { ref: pcolReviewRef.current, start: 0.77, end: 1.01, cards: [pcardVerifyRef, pcardAttestRef] },
    ];

    cols.forEach((col) => {
      if (!col.ref) return;
      
      const isCompleted = !showIntro && progress >= col.end;
      const isActive = !showIntro && progress >= col.start && progress < col.end;

      if (isCompleted) {
        col.ref.classList.add("completed");
        col.ref.classList.remove("active");
      } else if (isActive) {
        col.ref.classList.add("active");
        col.ref.classList.remove("completed");
      } else {
        col.ref.classList.remove("active", "completed");
      }

      col.cards.forEach((cardRef) => {
        const cardEl = cardRef.current;
        if (!cardEl) return;
        if (isCompleted) {
          cardEl.classList.add("completed");
          cardEl.classList.remove("active");
        } else if (isActive) {
          cardEl.classList.add("active");
          cardEl.classList.remove("completed");
        } else {
          cardEl.classList.remove("active", "completed");
        }
      });
    });

  };

  const animateExplanations = (progress: number) => {
    const showIntro = progress < 0.08;
    
    if (introExplanationRef.current) {
      if (showIntro) {
        introExplanationRef.current.classList.add("active");
      } else {
        introExplanationRef.current.classList.remove("active");
      }
    }

    const stepThresholds = [
      { start: 0.08, end: 0.31 },
      { start: 0.31, end: 0.54 },
      { start: 0.54, end: 0.77 },
      { start: 0.77, end: 1.01 },
    ];

    cardRefs.forEach((ref, index) => {
      const el = ref.current;
      if (!el) return;

      const threshold = stepThresholds[index];
      const active = !showIntro && progress >= threshold.start && progress < threshold.end;

      if (active) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });
  };

  return (
    <div
      className="landing-wrapper"
      ref={containerRef}
      onScroll={handleScroll}
    >
      {/* Background decoration grid overlays */}
      <div className="landing-grid-overlay" />

      {/* Navigation Bar */}
      <nav className={`landing-nav ${isScrolled ? "scrolled" : ""}`}>
        <Link href="/" className="nav-brand">
          <Image
            className="nav-logo-img"
            src="/mascot.png"
            alt="Linow mascot"
            width={24}
            height={24}
            priority
          />
          <span>Linow</span>
        </Link>

        {/* Floating center links pill */}
        <div className="nav-pill-wrapper">
          <div className="nav-pill-container">
            <a href="#how-it-works" className="nav-pill-link" onClick={(e) => {
              e.preventDefault();
              stickyTrackRef.current?.scrollIntoView({ behavior: "smooth" });
            }}>
              How It Works
            </a>

            <span className="nav-pill-separator">|</span>
            <a href="#benefits" className="nav-pill-link" onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById("benefits");
              el?.scrollIntoView({ behavior: "smooth" });
            }}>
              Benefits
            </a>
          </div>
        </div>

        <div className="nav-right-group">
          <Link href="/workspace" className="nav-login-link">
            Log in
          </Link>
          <Link href="/workspace" className="nav-cta-btn">
            Launch Workspace
          </Link>
        </div>
      </nav>

      {/* Hero Section with Scenic Backdrop placeholder */}
      <header className="landing-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            AI Audit Agent with Verifiable Walrus Memory
          </h1>
          <p className="hero-subtitle">
            Encrypt client-side evidence, register hash commitments on Sui, and log wallet-backed reviewer attestations. The agent proposes findings; the auditor signs on-chain.
          </p>
          
          <div className="hero-cta-group">
            <Link href="/workspace" className="hero-cta-primary">
              Launch Workspace
            </Link>
            <a href="#how-it-works" className="hero-cta-secondary" onClick={(e) => {
              e.preventDefault();
              stickyTrackRef.current?.scrollIntoView({ behavior: "smooth" });
            }}>
              Explore Architecture
            </a>
          </div>
        </div>
      </header>

      {/* Meet Linow & Workspace Mockup Section */}
      <section className="landing-meet-section" id="meet-linow">
        <div className="meet-content">
          <span className="meet-eyebrow">Evidence Intelligence</span>
          <h2 className="meet-title">
            Linow runs automated evidence classification, analyzes assertion gaps, and drafts structured audit findings for auditor review.
          </h2>
        </div>

        {/* Workspace Browser Mockup Container */}
        <div className="meet-browser-wrapper">
          <div className="hero-browser-window">
            <div className="browser-header">
              <div className="browser-dots">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>
              <div className="browser-address">linow.xyz/workspace</div>
              <div className="browser-actions">
                <span className="action-dot"></span>
              </div>
            </div>
            
            <div className="browser-viewport-content">
              {/* Left sidebar mock */}
              <div className="mock-sidebar">
                <div className="mock-sidebar-brand">
                  <div className="mock-logo"></div>
                  <div className="mock-text-short"></div>
                </div>
                <div className="mock-nav-item active"></div>
                <div className="mock-nav-item"></div>
                <div className="mock-nav-item"></div>
                <div className="mock-sidebar-spacer"></div>
                <div className="mock-sidebar-footer"></div>
              </div>
              
              {/* Workspace contents mock */}
              <div className="mock-workspace-main">
                <div className="mock-workspace-header">
                  <div className="mock-workspace-title">
                    <div className="mock-text-long"></div>
                    <div className="mock-text-medium" style={{ opacity: 0.5 }}></div>
                  </div>
                  <div className="mock-wallet-badge"></div>
                </div>
                
                <div className="mock-workspace-grid">
                  {/* Left Column: evidence uploads */}
                  <div className="mock-card">
                    <div className="mock-card-header"></div>
                    <div className="mock-file-list">
                      <div className="mock-file-item">
                        <div className="mock-file-icon"></div>
                        <div className="mock-file-info">
                          <div className="mock-text-medium"></div>
                          <div className="mock-text-small"></div>
                        </div>
                        <div className="mock-file-status verified"></div>
                      </div>
                      <div className="mock-file-item">
                        <div className="mock-file-icon"></div>
                        <div className="mock-file-info">
                          <div className="mock-text-medium"></div>
                          <div className="mock-text-small"></div>
                        </div>
                        <div className="mock-file-status verified"></div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: agent classification feed */}
                  <div className="mock-card">
                    <div className="mock-card-header agent"></div>
                    <div className="mock-agent-timeline">
                      <div className="mock-timeline-item">
                        <div className="mock-timeline-icon"></div>
                        <div className="mock-timeline-desc">
                          <div className="mock-text-medium"></div>
                          <div className="mock-text-small"></div>
                        </div>
                      </div>
                      <div className="mock-timeline-item">
                        <div className="mock-timeline-icon"></div>
                        <div className="mock-timeline-desc">
                          <div className="mock-text-medium"></div>
                          <div className="mock-text-small"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Interactive Web3 Scroll Section */}
      <section 
        className="sticky-scroll-container" 
        ref={stickyTrackRef}
        id="how-it-works"
      >
        <div className="sticky-viewport">
          <div className="sticky-layout-horizontal">
            
            {/* Left Side: Clean Step Explanations (No boxes, no backgrounds) */}
            <div className="pipeline-explanations-col">
              
              <div className="clean-explanation-step" ref={introExplanationRef}>
                <span className="step-badge">Pipeline Architecture</span>
                <h3 className="step-title">Evidence Chain of Custody</h3>
                <p className="step-desc">
                  This system processes client documents into cryptographically secure and immutable audit logs. Scroll down to walk through each phase of the evidence lifecycle.
                </p>
              </div>

              <div className="clean-explanation-step" ref={cardRefs[0]}>
                <span className="step-badge">Step 1 — Local Hash Generation</span>
                <h3 className="step-title">Upload & Generate Hash</h3>
                <p className="step-desc">
                  Select a client file. The application computes a SHA-256 hash locally in the browser. The raw document remains confidential on your local machine; only the cryptographic hash commitment is registered.
                </p>
              </div>

              <div className="clean-explanation-step" ref={cardRefs[1]}>
                <span className="step-badge">Step 2 — Client-Side Payload Encryption</span>
                <h3 className="step-title">Secure Decentralized Storage</h3>
                <p className="step-desc">
                  To guarantee strict confidentiality, evidence files are encrypted in the browser using AES-256-GCM prior to storage. The encrypted ciphertext is stored on the decentralized Walrus protocol.
                </p>
              </div>

              <div className="clean-explanation-step" ref={cardRefs[2]}>
                <span className="step-badge">Step 3 — On-Chain Anchor</span>
                <h3 className="step-title">Register On-Chain Commitment</h3>
                <p className="step-desc">
                  An immutable, tamper-evident EvidenceRecord is registered on the Sui ledger, anchoring the cryptographic hash commitment, transaction timestamp, and Walrus blob ID.
                </p>
              </div>

              <div className="clean-explanation-step" ref={cardRefs[3]}>
                <span className="step-badge">Step 4 — Auditor Verification & Attestation</span>
                <h3 className="step-title">Auditor Verification & Attestation</h3>
                <p className="step-desc">
                  The Auditor logs in, verifies the file integrity against the on-chain hash commitment, and signs wallet-backed attestations. The chain proves the timeline and integrity of the review.
                </p>
              </div>

            </div>

            {/* Right Side: Sticky Pipeline Board */}
            <div className="pipeline-board-col">
              <div className="pipeline-board">
                
                {/* Column 1: Local Prep */}
                <div className="pipeline-column" ref={pcolPrepRef} id="col-prep">
                  <div className="pipeline-col-header">
                    <span className="col-num">01</span>
                    <span className="col-title">LOCAL PREP</span>
                  </div>
                  <div className="pipeline-cards">
                    <div className="pipeline-card" ref={pcardUploadRef} id="pcard-upload">
                      <div className="pcard-role-tag company">Company Role</div>
                      <h4 className="pcard-title">Client File Selection</h4>
                      <div className="pcard-indicator">Raw File</div>
                    </div>
                    <div className="pipeline-card" ref={pcardHashRef} id="pcard-hash">
                      <div className="pcard-role-tag system">Browser Agent</div>
                      <h4 className="pcard-title">SHA-256 Hash</h4>
                      <div className="pcard-indicator code-font">Commitment</div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Secure Storage */}
                <div className="pipeline-column" ref={pcolStorageRef} id="col-storage">
                  <div className="pipeline-col-header">
                    <span className="col-num">02</span>
                    <span className="col-title">SECURE STORAGE</span>
                  </div>
                  <div className="pipeline-cards">
                    <div className="pipeline-card" ref={pcardEncryptRef} id="pcard-encrypt">
                      <div className="pcard-role-tag system">Browser Agent</div>
                      <h4 className="pcard-title">AES-256-GCM Encrypt</h4>
                      <div className="pcard-indicator code-font">Ciphertext</div>
                    </div>
                    <div className="pipeline-card" ref={pcardWalrusRef} id="pcard-walrus">
                      <div className="pcard-role-tag storage">Walrus Network</div>
                      <h4 className="pcard-title">Encrypted Blob Upload</h4>
                      <div className="pcard-indicator code-font">Blob ID</div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Durable Registry */}
                <div className="pipeline-column" ref={pcolRegistryRef} id="col-registry">
                  <div className="pipeline-col-header">
                    <span className="col-num">03</span>
                    <span className="col-title">DURABLE REGISTRY</span>
                  </div>
                  <div className="pipeline-cards">
                    <div className="pipeline-card" ref={pcardSuiRef} id="pcard-sui">
                      <div className="pcard-role-tag sui">Sui Blockchain</div>
                      <h4 className="pcard-title">Register EvidenceRecord</h4>
                      <div className="pcard-indicator code-font">Evidence Object</div>
                    </div>
                  </div>
                </div>

                {/* Column 4: Review Attestation */}
                <div className="pipeline-column" ref={pcolReviewRef} id="col-review">
                  <div className="pipeline-col-header">
                    <span className="col-num">04</span>
                    <span className="col-title">REVIEW ATTEST</span>
                  </div>
                  <div className="pipeline-cards">
                    <div className="pipeline-card" ref={pcardVerifyRef} id="pcard-verify">
                      <div className="pcard-role-tag auditor">Auditor Role</div>
                      <h4 className="pcard-title">Integrity Verification</h4>
                      <div className="pcard-indicator">Hash Comparison</div>
                    </div>
                    <div className="pipeline-card" ref={pcardAttestRef} id="pcard-attest">
                      <div className="pcard-role-tag auditor">Auditor Role</div>
                      <h4 className="pcard-title">Wallet Attestation</h4>
                      <div className="pcard-indicator code-font">Attestation Object</div>
                    </div>
                  </div>
                </div>



              </div>
            </div>

          </div>
        </div>
      </section>



      {/* Agentic Flow Showcase Section */}
      <section className="landing-agent-section" id="agent-flow">
        <div className="agent-grid-layout">
          
          {/* Left Column: Copywriting */}
          <div className="agent-desc-col">
            <span className="section-eyebrow">Autonomous Compliance Loop</span>
            <h2 className="agent-section-title">
              Verify compliance readiness locally & register findings on-chain
            </h2>
            <p className="agent-section-desc">
              Linow runs automated evidence mapping against required audit assertions. All actions proposed by the agent are anchored to the ledger and require wallet signature.
            </p>
            
            <div className="agent-feature-points">
              <div className="feature-point">
                <h4>Local Assertion Mapping</h4>
                <p>Analyze evidence files directly in the browser to class compliance indicators. Files never leave your local environment.</p>
              </div>
              
              <div className="feature-point">
                <h4>Ledger Commitments</h4>
                <p>Commit cryptographic proofs and agent rationales to the Sui blockchain, securing an immutable history.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Looping Simulation Card */}
          <div className="agent-simulation-col">
            <div className="agent-simulator-card mac-theme">
              
              {/* Mac Header */}
              <div className="mac-header">
                <div className="mac-controls">
                  <span className="control-dot close"></span>
                  <span className="control-dot minimize"></span>
                  <span className="control-dot expand"></span>
                </div>
                <div className="mac-title">Linow Co-Auditor</div>
                <div className="mac-status-badge">
                  <span className="status-dot"></span>
                  <span className="status-text">
                    {simPhase === 0 ? "scanning" : simPhase === 1 ? "analyzing" : simPhase === 2 ? "signing" : "synced"}
                  </span>
                </div>
              </div>

              {/* Chat Viewport */}
              <div className="sim-chat-viewport" ref={chatViewportRef}>
                
                {/* Agent Initial Message (Active in all phases) */}
                <div className="sim-chat-msg sim-agent-msg">
                  <div className="sim-msg-author">Co-Auditor</div>
                  <div className="sim-msg-content">
                    I am scanning the active workspace engagement files for compliance gaps.
                  </div>
                </div>

                {/* System Logs Message (Active in all phases) */}
                <div className="sim-chat-msg sim-system-msg">
                  <div className="sim-msg-author">system</div>
                  <div className="sim-msg-content">
                    <div className="log-line">
                      <span className="log-check">✔</span> Scan workspace engagement files
                    </div>
                    <div className="log-line">
                      <span className="log-check">✔</span> Read file: <code>bank_recon_december.pdf</code>
                    </div>
                    <div className={`log-line ${simPhase === 0 ? "running" : "success"}`}>
                      <span className="log-check">
                        {simPhase === 0 ? "⎔" : "✔"}
                      </span>
                      <span>
                        {simPhase === 0 ? "Mapping assertions..." : "Map assertions: existence, completeness"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Phase 1+: Analysis Report */}
                {simPhase >= 1 && (
                  <div className="sim-chat-msg sim-agent-msg animate-fade-in">
                    <div className="sim-msg-author">Co-Auditor</div>
                    <div className="sim-msg-content">
                      <p>Compliance run complete. I have mapped the document to Required ISA Assertions:</p>
                      
                      <div className="sim-msg-report-table">
                        <div className="sim-table-row">
                          <span>Existence Coverage</span>
                          <strong>98% confidence</strong>
                        </div>
                        <div className="sim-table-row">
                          <span>Completeness Gap</span>
                          <strong className="text-warning">external confirmation missing</strong>
                        </div>
                        <div className="sim-table-row">
                          <span>Readiness Score</span>
                          <strong className="text-success">75 / 100</strong>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Phase 2+: Commit Action */}
                {simPhase >= 2 && (
                  <div className="sim-chat-msg sim-agent-msg animate-fade-in">
                    <div className="sim-msg-author">Co-Auditor</div>
                    <div className="sim-msg-content">
                      <p>Rationales and file hashes are staged. Please sign the attestation commitment to anchor to the Sui ledger.</p>
                      
                      {simPhase === 2 ? (
                        <div className="sim-chat-action-btn flashing">
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                          </svg>
                          <span>Sign Review Attestation</span>
                        </div>
                      ) : (
                        <div className="sim-chat-attestation-success">
                          <span className="success-icon">✔</span> registered on Sui ledger (RegisterEvidence)
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Sticking Output Panel (only active on Phase 3 / Syncing) */}
              {simPhase === 3 && (
                isPending ? (
                  <div className="sim-broadcasting-bar animate-fade-in">
                    <span className="sim-spinner"></span>
                    <span>Broadcasting registry transaction to Sui...</span>
                  </div>
                ) : (
                  <div className="sim-ledger-log-panel animate-fade-in">
                    <span className="sim-ledger-header">ledger confirmation</span>
                    <div className="sim-ledger-box">
                      <div className="sim-ledger-item">
                        <span className="sim-dot"></span>
                        <span>Sui Transaction: <code>0x7a2c...8f2b</code></span>
                      </div>
                      <div className="sim-ledger-item">
                        <span className="sim-dot"></span>
                        <span>Evidence Blob stored on Walrus</span>
                      </div>
                      <div className="sim-ledger-item">
                        <span className="sim-dot"></span>
                        <span>MemWal ledger index synchronized</span>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Chat Input Field (Minimalist, borderless top) */}
              <div className="sim-chat-input-area">
                <span className="sim-input-placeholder">Ask Co-Auditor a question...</span>
                <svg className="sim-send-icon" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Hexagonal Trust Web Benefits Section */}
      <section className="landing-benefits-section" id="benefits">
        <div className="benefits-header">
          <span className="section-eyebrow">Engagement Benefits</span>
          <h2 className="section-title">A Shared Hub for Verifiable Auditing</h2>
          <p className="benefits-subtitle">
            Linow streamlines readiness prep for companies and simplifies verification for auditors on a single cryptographic network.
          </p>
        </div>

        {/* Role Toggle Switcher */}
        <div className="benefits-toggle-wrapper">
          <div className="benefits-toggle-container">
            <div className={`benefits-toggle-indicator role-${activeRole}`} />
            <button
              className={`benefits-toggle-btn ${activeRole === "company" ? "active" : ""}`}
              onClick={() => {
                setActiveRole("company");
                setActiveNodeIndex(0);
              }}
            >
              For Company
            </button>
            <button
              className={`benefits-toggle-btn ${activeRole === "auditor" ? "active" : ""}`}
              onClick={() => {
                setActiveRole("auditor");
                setActiveNodeIndex(3);
              }}
            >
              For Auditor
            </button>
          </div>
        </div>

        {/* Interactive Hexagon Trust Web Layout */}
        <div className="benefits-interactive-grid">
          
          {/* Left Panel: Desktop Hexagonal Trust Web Visual */}
          <div className="benefits-visual-panel">
            
            {/* SVG Lines overlay */}
            <svg className="benefits-svg-overlay" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Outer Hexagon outline */}
              <polygon
                points="30,23 18,50 30,77 70,77 82,50 70,23"
                className="hexagon-perimeter-line"
              />
              
              {/* Radiating Spokes from Center Ledger (50, 50) */}
              {benefitsNodes.map((node) => {
                const isActive = activeNodeIndex === node.id;
                const isRoleMatch = node.role === activeRole;
                return (
                  <line
                    key={`spoke-${node.id}`}
                    x1="50"
                    y1="50"
                    x2={node.x}
                    y2={node.y}
                    className={`hexagon-spoke-line ${isActive ? "active" : ""} ${isRoleMatch ? "active-role" : "standby-role"}`}
                  />
                );
              })}
            </svg>

            {/* Central Shared Trust Ledger Hub */}
            <div className="hexagon-center-hub">
              <div className="center-hub-ring">
                <Image
                  src="/mascot.png"
                  alt="Linow Mascot Hub"
                  width={34}
                  height={34}
                  className="center-hub-mascot"
                />
              </div>
              <span className="center-hub-label">Trust Ledger</span>
            </div>

            {/* 6 Outer Nodes */}
            {benefitsNodes.map((node) => {
              const isActive = activeNodeIndex === node.id;
              const isRoleMatch = node.role === activeRole;
              return (
                <div
                  key={node.id}
                  className={`hexagon-node-wrapper ${isActive ? "active" : ""} ${isRoleMatch ? "active-role" : "standby-role"}`}
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                  }}
                  onClick={() => {
                    setActiveNodeIndex(node.id);
                    setActiveRole(node.role);
                  }}
                >
                  <div className="hexagon-node-circle">
                    {node.icon}
                  </div>
                  <span className="hexagon-node-pill">{node.label}</span>
                </div>
              );
            })}

          </div>

          {/* Bottom Panel: Clean text-only explanation below hexagon */}
          <div className="benefits-details-panel">
            <div className="benefits-details-text-only" key={activeNodeIndex}>
              <p className="details-full-text">
                {benefitsNodes[activeNodeIndex].detail}
              </p>
            </div>
          </div>

        </div>

        {/* Mobile-only benefits list fallback (hidden on desktop) */}
        <div className="benefits-mobile-list">
          {benefitsNodes
            .filter((node) => node.role === activeRole)
            .map((node) => (
              <div
                key={`mobile-${node.id}`}
                className={`benefits-mobile-card ${activeNodeIndex === node.id ? "active" : ""}`}
                onClick={() => setActiveNodeIndex(node.id)}
              >
                <div className="mobile-card-header">
                  <div className="mobile-card-icon-wrap">
                    {node.icon}
                  </div>
                  <h4>{node.title}</h4>
                </div>
                <p>{node.detail}</p>
              </div>
            ))}
        </div>

      </section>

      {/* Bottom CTA Section */}
      <section className="landing-cta-section">
        <div className="cta-glass-card">
          <h2 className="cta-title">Build your verifiable audit trail</h2>
          <p className="cta-desc">
            Choose your role—Company or Auditor—and connect your wallet. Gather evidence, map assertions, and run pre-audit verification anchored on Sui and stored on Walrus.
          </p>
          <Link href="/workspace" className="cta-btn-primary">
            Launch Workspace
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <Link href="/" className="footer-brand">
          <Image
            className="footer-logo-img"
            src="/mascot.png"
            alt="Linow mascot"
            width={16}
            height={16}
          />
          <span>Linow</span>
        </Link>
        <p className="footer-copyright">&copy; {new Date().getFullYear()} Linow. Powered by Sui & Walrus.</p>
      </footer>
    </div>
  );
}
