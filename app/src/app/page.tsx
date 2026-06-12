"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import "./landing.css";

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyTrackRef = useRef<HTMLDivElement>(null);
  const layerBottomRef = useRef<HTMLDivElement>(null);
  const layerMiddleRef = useRef<HTMLDivElement>(null);
  const layerTopAppRef = useRef<HTMLDivElement>(null);
  const layerTopWalletRef = useRef<HTMLDivElement>(null);
  const flowLinesRef = useRef<HTMLDivElement>(null);
  const introTitleRef = useRef<HTMLDivElement>(null);
  
  // Card elements references
  const cardRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  // We can track scroll state to handle navbar styling transitions
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    
    // Initial run to lay out elements correctly
    handleScroll();
  }, []);

  const handleScroll = () => {
    if (!containerRef.current || !stickyTrackRef.current || !layerBottomRef.current) return;

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
      animateStack(localProgress);
      animateCards(localProgress);
    });
  };

  const animateStack = (progress: number) => {
    const layerBottom = layerBottomRef.current;
    const layerMiddle = layerMiddleRef.current;
    const layerTopApp = layerTopAppRef.current;
    const layerTopWallet = layerTopWalletRef.current;
    const flowLines = flowLinesRef.current;

    if (!layerBottom || !layerMiddle || !layerTopApp || !layerTopWallet) return;

    // Define active states based on progress:
    let activeLayer = 0;
    if (progress < 0.1) {
      activeLayer = 0; 
    } else if (progress >= 0.1 && progress < 0.38) {
      activeLayer = 1; // bottom active
    } else if (progress >= 0.38 && progress < 0.65) {
      activeLayer = 2; // middle active
    } else if (progress >= 0.65 && progress < 0.88) {
      activeLayer = 3; // top active
    } else {
      activeLayer = 4; // all active
    }

    const setLayerState = (el: HTMLElement, isActive: boolean, isDim: boolean) => {
      if (isActive) {
        el.classList.add("active");
        el.classList.remove("dim");
      } else if (isDim) {
        el.classList.add("dim");
        el.classList.remove("active");
      } else {
        el.classList.remove("active", "dim");
      }
    };

    const bottomActive = activeLayer === 1 || activeLayer === 4;
    const bottomDim = activeLayer !== 1 && activeLayer !== 4 && activeLayer !== 0;

    const middleActive = activeLayer === 2 || activeLayer === 4;
    const middleDim = activeLayer !== 2 && activeLayer !== 4 && activeLayer !== 0;

    const topActive = activeLayer === 3 || activeLayer === 4;
    const topDim = activeLayer !== 3 && activeLayer !== 4 && activeLayer !== 0;

    setLayerState(layerBottom, bottomActive, bottomDim);
    setLayerState(layerMiddle, middleActive, middleDim);
    setLayerState(layerTopApp, topActive, topDim);
    setLayerState(layerTopWallet, topActive, topDim);

    if (flowLines) {
      if (activeLayer === 4) {
        flowLines.classList.add("active");
      } else {
        flowLines.classList.remove("active");
      }
    }
  };

  const animateCards = (progress: number) => {
    const cardPeaks = [0.25, 0.45, 0.65, 0.85];
    const range = 0.15; // Width of card activation overlap

    // Animate Intro Title (active when progress is close to 0)
    const introEl = introTitleRef.current;
    if (introEl) {
      let opacity = 1;
      let translateY = 0;
      let scale = 1;
      let blur = 0;

      if (progress < 0.05) {
        opacity = 1;
        translateY = 0;
        scale = 1;
        blur = 0;
      } else if (progress >= 0.05 && progress < 0.22) {
        const t = (progress - 0.05) / 0.17; // 0 to 1
        opacity = 1 - t;
        translateY = -t * 40; // rise up
        scale = 1 - t * 0.03;
        blur = t * 4;
      } else {
        opacity = 0;
        translateY = -40;
        scale = 0.97;
        blur = 4;
      }

      introEl.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
      introEl.style.opacity = `${opacity}`;
      introEl.style.filter = `blur(${blur}px)`;
      introEl.style.zIndex = opacity > 0.01 ? "12" : "1";
      introEl.style.pointerEvents = opacity > 0.1 ? "auto" : "none";
    }

    cardRefs.forEach((ref, index) => {
      const card = ref.current;
      if (!card) return;

      const peak = cardPeaks[index];
      const dist = progress - peak;

      let opacity = 0;
      let scale = 0.93;
      let translateY = 100;
      let rotateX = 10;
      let blur = 8;
      let active = false;

      if (Math.abs(dist) < range) {
        active = true;
        const normalized = dist / range; // -1 to 1
        opacity = 1 - Math.pow(normalized, 2);
        scale = 1 - Math.pow(normalized, 2) * 0.04;
        translateY = normalized * -30; 
        rotateX = normalized * -8;
        blur = Math.pow(normalized, 2) * 4;
      } else if (dist <= -range) {
        opacity = 0;
        scale = 0.9;
        translateY = 100;
        rotateX = 10;
        blur = 8;
      } else {
        opacity = 0.15; // Keep slightly visible as a background stack
        scale = 0.94 - (dist - range) * 0.04;
        translateY = -40 - (dist - range) * 12; // Stacking offsets
        rotateX = -6;
        blur = 4;
      }

      card.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale}) rotateX(${rotateX}deg)`;
      card.style.opacity = `${opacity}`;
      card.style.filter = `blur(${blur}px)`;
      card.style.zIndex = active ? "10" : `${5 - index}`;
      
      if (opacity > 0.6) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
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
            <a href="#roadmap" className="nav-pill-link" onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById("roadmap");
              el?.scrollIntoView({ behavior: "smooth" });
            }}>
              Roadmap
            </a>
            <span className="nav-pill-separator">|</span>
            <a href="#compare" className="nav-pill-link" onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById("compare");
              el?.scrollIntoView({ behavior: "smooth" });
            }}>
              Compare
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
          <span className="hero-badge">Verifiable Agent Memory Layer</span>
          <h1 className="hero-title">
            Persistent audit readiness for AI agents
          </h1>
          <p className="hero-subtitle">
            Every classification, findings detail, and coverage gap is preserved as durable memory on Walrus and anchored on Sui. Agent proposes, human signs, chain proves.
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
          <span className="meet-eyebrow">Meet Linow</span>
          <h2 className="meet-title">
            Linow is an AI audit agent that classifies evidence, identifies gaps, and produces structured audit findings
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
          <div className="sticky-layout-vertical">
            
            {/* Level 1: Section Header (Meet Linow style) */}
            <div className="stack-section-header">
              <span className="meet-eyebrow">Linow's Stack</span>
              <h2 className="meet-title">Tamper-evident verification pipeline</h2>
            </div>

            {/* Level 2: 3D Stack Interactive Display */}
            <div className="stack-display-pane">
              <div className="stack-isometric-viewport">
                <div className="stack-isometric-assembly">
                  
                  {/* Grid floor shadow/effect */}
                  <div className="stack-floor-grid" />

                  {/* 3D Vertical Flow Beams */}
                  <div className="stack-flow-lines" ref={flowLinesRef}>
                    <div className="flow-beam beam-bottom-mid" />
                    <div className="flow-beam beam-mid-app" />
                    <div className="flow-beam beam-mid-wallet" />
                  </div>

                  {/* Layer 1: Consensus & Storage (Bottom Slab) */}
                  <div className="stack-block block-bottom" ref={layerBottomRef}>
                    <div className="block-face face-top">
                      <svg className="face-svg" viewBox="0 0 280 280">
                        <path d="M 140 140 L 60 60" className="circuit-line" />
                        <path d="M 140 140 L 220 220" className="circuit-line" />
                        <circle cx="140" cy="140" r="4" className="circuit-node" />
                      </svg>
                      
                      <div className="layer-header">
                        <span className="layer-title">Consensus & Storage</span>
                        <span className="layer-subtitle">Sui & Walrus Ledger</span>
                      </div>
                      <div className="layer-details">
                        <div className="detail-tag">Sui Move contract</div>
                        <div className="detail-tag">Walrus storage</div>
                      </div>
                    </div>
                    <div className="block-face face-left" />
                    <div className="block-face face-right" />
                  </div>

                  {/* Layer 2: SDK & Cryptography (Middle Container) */}
                  <div className="block-middle-container" ref={layerMiddleRef}>
                    {/* Left Block: Crypto Engine */}
                    <div className="stack-block block-crypto">
                      <div className="block-face face-top">
                        <div className="layer-header">
                          <span className="layer-title">Crypto Core</span>
                          <span className="layer-subtitle">AES-256-GCM & SHA-256</span>
                        </div>
                      </div>
                      <div className="block-face face-left" />
                      <div className="block-face face-right" />
                    </div>

                    {/* Right Block: Transaction Builder */}
                    <div className="stack-block block-tx-sdk">
                      <div className="block-face face-top">
                        <div className="layer-header">
                          <span className="layer-title">TX Builder</span>
                          <span className="layer-subtitle">Sui Transaction SDK</span>
                        </div>
                      </div>
                      <div className="block-face face-left" />
                      <div className="block-face face-right" />
                    </div>
                  </div>

                  {/* Top Layer Group (Vertical Towers) */}
                  {/* Left Towers: User Applications */}
                  <div className="block-towers-app-container" ref={layerTopAppRef}>
                    {/* Tower 1: Workspace UI */}
                    <div className="stack-block block-tower tower-workspace">
                      <div className="block-face face-top">
                        <span className="tower-top-label">UI</span>
                      </div>
                      <div className="block-face face-left">
                        <span className="vertical-tower-label">WORKSPACE UI</span>
                      </div>
                      <div className="block-face face-right" />
                    </div>

                    {/* Tower 2: MemWal Indexer */}
                    <div className="stack-block block-tower tower-memwal">
                      <div className="block-face face-top">
                        <span className="tower-top-label">MEM</span>
                      </div>
                      <div className="block-face face-left">
                        <span className="vertical-tower-label">MEMWAL INDEXER</span>
                      </div>
                      <div className="block-face face-right" />
                    </div>
                  </div>

                  {/* Right Towers: Attestation & Portal */}
                  <div className="block-towers-wallet-container" ref={layerTopWalletRef}>
                    {/* Tower 3: Sui Attestation */}
                    <div className="stack-block block-tower tower-attestation">
                      <div className="block-face face-top">
                        <span className="tower-top-label">SIG</span>
                      </div>
                      <div className="block-face face-left">
                        <span className="vertical-tower-label">SUI SIGNER</span>
                      </div>
                      <div className="block-face face-right" />
                    </div>

                    {/* Tower 4: Walrus Portal */}
                    <div className="stack-block block-tower tower-walrus">
                      <div className="block-face face-top">
                        <span className="tower-top-label">WAL</span>
                      </div>
                      <div className="block-face face-left">
                        <span className="vertical-tower-label">WALRUS PORTAL</span>
                      </div>
                      <div className="block-face face-right" />
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Level 3: Centered Explanation Cards */}
            <div className="stack-explanations-pane">
              
              {/* Intro Title: replaced by each layer card on scroll */}
              <div className="stack-pane-intro" ref={introTitleRef}>
                <p className="intro-description-centered">
                  Linow integrates decentralized storage, cryptographic file commitments, and human attestation into an immutable audit trail.
                </p>
              </div>

              {/* Card 1: Upload & Local Hash */}
              <div className="glass-scroll-card" ref={cardRefs[0]}>
                <span className="card-step-badge">Step 1 — local hashing</span>
                <h3 className="card-title">Upload & Generate Hash</h3>
                <p className="card-description">
                  Upload any evidence document. Linow hashes the file locally inside your browser using SHA-256. The raw document stays completely private and never leaves your machine.
                </p>
              </div>

              {/* Card 2: Encrypt & Store */}
              <div className="glass-scroll-card" ref={cardRefs[1]}>
                <span className="card-step-badge">Step 2 — Client-side encryption</span>
                <h3 className="card-title">Secure Decentralized Storage</h3>
                <p className="card-description">
                  To ensure complete confidentiality, evidence files are encrypted client-side using AES-256-GCM prior to transmission. The encrypted payload is stored securely on Walrus.
                </p>
              </div>

              {/* Card 3: Sui Registration */}
              <div className="glass-scroll-card" ref={cardRefs[2]}>
                <span className="card-step-badge">Step 3 — Sui Blockchain</span>
                <h3 className="card-title">Register On-Chain Commitment</h3>
                <p className="card-description">
                  An immutable, tamper-evident EvidenceRecord is registered on Sui. The transaction records the cryptographic commitment and the Walrus blob pointer securely.
                </p>
              </div>

              {/* Card 4: Verification & Attestation */}
              <div className="glass-scroll-card" ref={cardRefs[3]}>
                <span className="card-step-badge">Step 4 — Verification Trail</span>
                <h3 className="card-title">Auditor Verification & Attestation</h3>
                <p className="card-description">
                  Auditors retrieve the encrypted record, verify the local file hash against the Sui commitment to confirm integrity, and record wallet-backed reviewer attestations on-chain.
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Source Confidence Spectrum Section (Cofounder style) */}
      <section className="landing-roadmap-section" id="roadmap">
        <div className="roadmap-grid-layout">
          {/* Left Description Column */}
          <div className="roadmap-desc-col">
            <span className="section-eyebrow">Source Confidence Spectrum</span>
            <h2 className="roadmap-section-title">
              Verifiable evidence classification from L0 to L5
            </h2>
            <p className="roadmap-section-desc">
              Audit proof is a spectrum, not a binary value. Linow grades source confidence levels to help reviewers instantly identify how evidence was collected and verified.
            </p>
            <div className="roadmap-cta-wrap">
              <Link href="/workspace" className="roadmap-inline-cta">
                View spectrum metrics &rarr;
              </Link>
            </div>
          </div>

          {/* Right Columns Grid */}
          <div className="roadmap-columns-board">
            
            {/* Stage 1: Cryptographic Integrity */}
            <div className="roadmap-board-column">
              <div className="column-header">
                <div className="column-stage-num">01</div>
                <h3 className="column-stage-title">Integrity & Time</h3>
              </div>
              <div className="column-cards">
                <div className="roadmap-card">
                  <div className="card-level-tag">L0</div>
                  <h4 className="roadmap-card-title">Integrity Proof</h4>
                  <p className="roadmap-card-desc">The local file hash matches the registered on-chain commitment. Tamper-evident proof.</p>
                </div>
                <div className="roadmap-card">
                  <div className="card-level-tag">L1</div>
                  <h4 className="roadmap-card-title">Timestamp Proof</h4>
                  <p className="roadmap-card-desc">Evidence record was registered at a precise Sui network timestamp. Unalterable.</p>
                </div>
              </div>
            </div>

            {/* Stage 2: Human Attestation */}
            <div className="roadmap-board-column">
              <div className="column-header">
                <div className="column-stage-num">02</div>
                <h3 className="column-stage-title">Attestation Trail</h3>
              </div>
              <div className="column-cards">
                <div className="roadmap-card">
                  <div className="card-level-tag">L2</div>
                  <h4 className="roadmap-card-title">Company Claim</h4>
                  <p className="roadmap-card-desc">The company uploaded the document and claimed its source, verified by the company wallet signature.</p>
                </div>
                <div className="roadmap-card">
                  <div className="card-level-tag">L3</div>
                  <h4 className="roadmap-card-title">Reviewer Attestation</h4>
                  <p className="roadmap-card-desc">An independent reviewer/auditor wallet reviewed and attested to the document's relevance and validity.</p>
                </div>
              </div>
            </div>

            {/* Stage 3: Automated Connection */}
            <div className="roadmap-board-column">
              <div className="column-header">
                <div className="column-stage-num">03</div>
                <h3 className="column-stage-title">Automated Continuous Proof</h3>
              </div>
              <div className="column-cards">
                <div className="roadmap-card pending">
                  <div className="card-level-tag">L4</div>
                  <h4 className="roadmap-card-title">Connector Proof</h4>
                  <p className="roadmap-card-desc">Document imported directly from a verified system API (e.g. bank connection, QuickBooks, ERP).</p>
                </div>
                <div className="roadmap-card pending">
                  <div className="card-level-tag">L5</div>
                  <h4 className="roadmap-card-title">Continuous System Proof</h4>
                  <p className="roadmap-card-desc">Evidence generated dynamically and registered automatically by background system connectors.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Comparative Grid (GetModern style Compare) */}
      <section className="landing-compare-section" id="compare">
        <div className="compare-header">
          <span className="section-eyebrow">Comparisons</span>
          <h2 className="section-title">See how Linow compares</h2>
          <p className="compare-subtitle">
            Traditional audits rely on manual email threads and spreadsheets. Linow builds a secure, verifiable system of record.
          </p>
        </div>

        <div className="compare-cards-grid">
          {/* Card 1: Legacy */}
          <div className="compare-card">
            <div className="compare-icon-wrap legacy">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
            </div>
            <h3 className="compare-card-title">Legacy Shared Drives</h3>
            <p className="compare-card-desc">
              Audit files are scattered across emails and drives. No proof of document existence, integrity, or timestamp. PCAOB deficiency rates remain high due to unverifiable trails.
            </p>
            <div className="compare-button-wrap">
              <span className="compare-action-link">How legacy fails &rarr;</span>
            </div>
          </div>

          {/* Card 2: Stateless Agents */}
          <div className="compare-card">
            <div className="compare-icon-wrap stateless">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v17.792M14.25 3.104v17.792M9.75 6.375c0 .621-.504 1.125-1.125 1.125H4.125C3.504 7.5 3 6.996 3 6.375V4.125C3 3.504 3.504 3 4.125 3h4.5c.621 0 1.125 0 1.125.625M9.75 14.25c0 .621-.504 1.125-1.125 1.125H4.125C3.504 15.375 3 14.871 3 14.25v-2.25C3 11.379 3.504 10.875 4.125 10.875h4.5c.621 0 1.125 .504 1.125 1.125M9.75 22.125c0 .621-.504 1.125-1.125 1.125H4.125C3.504 23.25 3 22.746 3 22.125v-2.25c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125 .504 1.125 1.125M21 6.375c0 .621-.504 1.125-1.125 1.125h-4.5c-.621 0-1.125-.504-1.125-1.125V4.125c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125 .504 1.125 1.125M21 14.25c0 .621-.504 1.125-1.125 1.125h-4.5c-.621 0-1.125-.504-1.125-1.125v-2.25c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125 .504 1.125 1.125M21 22.125c0 .621-.504 1.125-1.125 1.125h-4.5c-.621 0-1.125-.504-1.125-1.125v-2.25c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125 .504 1.125 1.125" />
              </svg>
            </div>
            <h3 className="compare-card-title">Stateless AI Agents</h3>
            <p className="compare-card-desc">
              AI agents lack persistent memory across sessions. Classifications exist in RAM and are lost on restart, making agent decisions impossible to trace or rely on for audits.
            </p>
            <div className="compare-button-wrap">
              <span className="compare-action-link">How agents fail &rarr;</span>
            </div>
          </div>

          {/* Card 3: Linow (Highlight/Recommended) */}
          <div className="compare-card highlight">
            <div className="compare-icon-wrap linow">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
            <h3 className="compare-card-title">Linow Workspace</h3>
            <p className="compare-card-desc">
              Decentralized, persistent, and verifiable memory layer powered by MemWal. Client-side AES-256 encrypted records stored on Walrus and anchored on Sui for clear audit verification.
            </p>
            <div className="compare-button-wrap">
              <span className="compare-action-link">How Linow wins &rarr;</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="landing-cta-section">
        <div className="cta-glass-card">
          <span className="cta-eyebrow">Get Started</span>
          <h2 className="cta-title">Build your verifiable audit trail</h2>
          <p className="cta-desc">
            Connect your wallet to launch the workspace. Streamline evidence gathering, map assertions, and run pre-audit verification powered by Sui and Walrus.
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
