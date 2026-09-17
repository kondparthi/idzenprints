import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import aadhaarCardImg from "@/assets/landing/aadhaar_PVC_Card.png";
import employeeCardImg from "@/assets/landing/employee_card.png";
import rationCardImg from "@/assets/landing/ration_card.png";
import studentsCardImg from "@/assets/landing/students_card.png";
import visitingCardsImg from "@/assets/landing/visiting_cards.png";
import customCardsImg from "@/assets/landing/custom_PVC_Cards.png";
import idzenLogo from "@/assets/brand/idzen-logo.png";
import idzenIcon from "@/assets/brand/idzen-icon.png";
import { useCart } from "@/cart/CartContext";
import "@/storefront/Storefront.css";
import "./Landing.css";

const FAQS: { question: string; answer: string }[] = [
  {
    question: "What types of PVC cards can I create?",
    answer:
      "You can create Aadhaar PVC cards, FSC/Ration Cards, Employee ID cards, Student ID cards, Visiting Cards, Membership Cards, and fully customized PVC cards.",
  },
  {
    question: "Can I upload an existing document?",
    answer: "Yes. Supported documents can be uploaded and processed to extract the available information automatically.",
  },
  {
    question: "Can I edit the extracted information?",
    answer: "Yes. Extracted information is always reviewed and can be manually corrected before the card is created.",
  },
  {
    question: "Can I change the card design?",
    answer: "Yes. You can select from available templates and customize the supported design elements.",
  },
  {
    question: "Can I add a photo?",
    answer: "Yes. Photos can be uploaded and adjusted to fit the card template.",
  },
  {
    question: "Can I add a QR code or barcode?",
    answer: "Yes — supported templates can include QR codes and barcodes.",
  },
  {
    question: "What file formats can I download?",
    answer: "IDZEN can generate high-quality PDF, PNG, and JPG files.",
  },
  {
    question: "Can I print the generated card directly?",
    answer: "The generated print-ready file can be downloaded and sent straight to your PVC card printer or printing workflow.",
  },
  {
    question: "Do you directly fetch Aadhaar information?",
    answer:
      "No. The initial system does not connect to UIDAI directly. Customer-provided documents are processed, and the extracted information is reviewed before the card is generated.",
  },
  {
    question: "Do you directly fetch FSC/Ration Card information?",
    answer:
      "No. The initial system does not connect to the Telangana Government database directly. Customer-provided FSC/Ration Card documents are processed instead.",
  },
];

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [isContactSent, setIsContactSent] = useState(false);
  const { itemCount, openDrawer } = useCart();
  const faqAnswerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const faqHeights = useRef<number[]>([]);

  // React Router's client-side navigation doesn't auto-scroll to a
  // #hash the way a full page load does — needed now that other
  // storefront pages link back here as "/#services" etc.
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        // Wait a tick for the page's own content/images to lay out
        // first, so the scroll lands on the right spot.
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 50);
      }
    }
  }, []);

  // Recompute the open FAQ answer's height whenever it changes, so the
  // CSS max-height transition animates to the right value.
  useEffect(() => {
    if (openFaqIndex !== null) {
      const el = faqAnswerRefs.current[openFaqIndex];
      if (el) faqHeights.current[openFaqIndex] = el.scrollHeight + 24;
    }
  }, [openFaqIndex]);

  // Header shadow on scroll.
  useEffect(() => {
    function handleScroll() {
      setIsHeaderScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll-reveal — a single restrained treatment for section headers and
  // panels, scoped to this page only.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const revealEls = container.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || revealEls.length === 0) {
      revealEls.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Lock page scroll while the mobile nav is open, matching the original.
  useEffect(() => {
    document.body.style.overflow = isMobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileNavOpen]);

  function handleContactSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsContactSent(true);
    const form = event.currentTarget;
    setTimeout(() => {
      setIsContactSent(false);
      form.reset();
    }, 2400);
  }

  return (
    <div className="landing-page" ref={containerRef}>
<header className="site-header" style={{ boxShadow: isHeaderScrolled ? "0 8px 24px -18px rgba(23,26,35,0.4)" : "none" }}>
<a className="logo" href="#top">
<img src={idzenLogo} alt="IDZEN Prints" className="logo-mark-full" />
</a>
<nav aria-label="Primary" className="nav-desktop">
<ul className="nav-links">
<li><a href="#top">Home</a></li>
<li><a href="#services">Services</a></li>
<li><a href="#how-it-works">How It Works</a></li>
<li><a href="#about">About Us</a></li>
<li><a href="#contact">Contact</a></li>
<li><Link to="/shop">Shop</Link></li>
</ul>
<button type="button" className="storefront-cart-btn landing-cart-btn" onClick={openDrawer} aria-label="Open cart">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
  </svg>
  {itemCount > 0 && <span className="storefront-cart-badge">{itemCount > 99 ? "99+" : itemCount}</span>}
</button>
<Link className="btn btn-gradient" to="/register">
        Create Your Card
        <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg>
</Link>
</nav>
<button aria-label="Open menu" className="nav-toggle" onClick={() => setIsMobileNavOpen(true)}>
<svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M4 7h16M4 12h16M4 17h16"></path>
</svg>
</button>
</header>
<div className={"nav-scrim" + (isMobileNavOpen ? " is-open" : "")} onClick={() => setIsMobileNavOpen(false)}></div>
<nav aria-label="Mobile" className={"nav-mobile" + (isMobileNavOpen ? " is-open" : "")} onClick={() => setIsMobileNavOpen(false)}>
<div className="nav-mobile-top">
<span className="logo" style={{color: "inherit"}}><img src={idzenIcon} alt="" className="logo-mark" />IDZEN</span>
<button aria-label="Close menu" className="nav-mobile-close" onClick={() => setIsMobileNavOpen(false)}>
<svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M6 6l12 12M18 6L6 18"></path>
</svg>
</button>
</div>
<a href="#top">Home</a>
<a href="#services">Services</a>
<a href="#how-it-works">How It Works</a>
<a href="#about">About Us</a>
<a href="#contact">Contact</a>
<Link to="/shop">Shop</Link>
<Link className="btn btn-gradient" style={{marginTop: "8px", justifyContent: "center"}} to="/register">Create Your
      Card</Link>
</nav>
<main id="top">


<section className="hero">
<div className="hero-inner">
<div>
<span className="hero-eyebrow"><span className="hero-eyebrow-dot"></span> Professional PVC card printing
            services</span>
<h1>Create your PVC card quickly and easily</h1>
<p className="hero-desc">Upload your document, verify your details, choose a professional card design, and
            generate a high-quality print-ready card — Aadhaar PVC, FSC/Ration, Employee ID, Student ID, Visiting Cards,
            or something fully custom.</p>
<div className="hero-actions">
<Link className="btn btn-gradient" to="/register">
              Create Your Card
              <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg>
</Link>
<a className="btn btn-outline" href="#services">View Our Services</a>
</div>
<p className="hero-note">
<svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M20 6L9 17l-5-5"></path>
</svg>
            No direct UIDAI or government database access — every detail is reviewed by an operator before printing.
          </p>
</div>
<div aria-hidden="true" className="card-deck">
<div className="pvc-card pvc-card-1">
<div className="pvc-card-inner">
<img alt="Aadhaar PVC Card" src={aadhaarCardImg} style={{width: "100%"}}/>
</div>
</div>
<div className="pvc-card pvc-card-2">
<div className="pvc-card-inner">
<img alt="FSC/Ration PVC Card" src={employeeCardImg} style={{width: "100%"}}/>
</div>
</div>
<div className="pvc-card pvc-card-3">
<div className="pvc-card-inner">
<img alt="FSC/Ration PVC Card" src={aadhaarCardImg} style={{width: "100%"}}/>
</div>
</div>
</div>
</div>
</section>

<section className="trust-strip">
<div className="trust-grid">
<div className="trust-item">
<h4>Fast processing</h4>
<p>Quick document-to-card turnaround.</p>
</div>
<div className="trust-item">
<h4>Professional quality</h4>
<p>High-quality card designs and print output.</p>
</div>
<div className="trust-item">
<h4>Multiple card types</h4>
<p>Choose from a full range of PVC card options.</p>
</div>
<div className="trust-item">
<h4>A simple process</h4>
<p>Upload, verify, design, and print.</p>
</div>
</div>
</section>

<section className="section" id="services">
<div className="section-inner">
<div className="section-head reveal">
<span className="section-kicker">What we print</span>
<h2>PVC cards for every need</h2>
<p>Choose the card you need and create a professional design ready for printing.</p>
</div>
<div className="services-grid">
<article className="service-card">
<div aria-hidden="true" className="service-card-media photo-slot">
<img alt="Aadhaar PVC Card" src={aadhaarCardImg} style={{width: "100%"}}/>
</div>
<div className="service-card-body">
<div className="service-icon"><i className="bi bi-credit-card-2-front"></i></div>
<h3>Aadhaar PVC Card</h3>
<p>Convert a customer-provided Aadhaar document into a professionally formatted PVC card, subject to
                applicable requirements.</p>
<Link className="btn-ghost" to="/register">Create Aadhaar Card <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg></Link>
</div>
</article>
<article className="service-card">
<div aria-hidden="true" className="service-card-media photo-slot">
<img alt="Aadhaar PVC Card" src={rationCardImg} style={{width: "100%"}}/>
</div>
<div className="service-card-body">
<div className="service-icon"><i className="bi bi-file-earmark-text"></i></div>
<h3>FSC / Ration Card</h3>
<p>Create PVC cards using customer-provided FSC or Ration Card information.</p>
<Link className="btn-ghost" to="/register">Create FSC Card <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg></Link>
</div>
</article>
<article className="service-card">
<div aria-hidden="true" className="service-card-media photo-slot">
<img alt="Aadhaar PVC Card" src={employeeCardImg} style={{width: "100%"}}/>
</div>
<div className="service-card-body">
<div className="service-icon"><i className="bi bi-person-badge"></i></div>
<h3>Employee ID Cards</h3>
<p>Professional employee identification cards for businesses, offices, factories, and organizations.</p>
<Link className="btn-ghost" to="/register">Create Employee Card <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg></Link>
</div>
</article>
<article className="service-card">
<div aria-hidden="true" className="service-card-media photo-slot">
<img alt="Aadhaar PVC Card" src={studentsCardImg} style={{width: "100%"}}/>
</div>
<div className="service-card-body">
<div className="service-icon"><i className="bi bi-mortarboard-fill"></i></div>
<h3>Student ID Cards</h3>
<p>Custom student identity cards for schools, colleges, institutes, and educational organizations.</p>
<Link className="btn-ghost" to="/register">Create Student Card <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg></Link>
</div>
</article>
<article className="service-card">
<div aria-hidden="true" className="service-card-media photo-slot">
<img alt="Aadhaar PVC Card" src={visitingCardsImg} style={{width: "100%"}}/>
</div>
<div className="service-card-body">
<div className="service-icon"><i className="bi bi-credit-card"></i></div>
<h3>Visiting Cards</h3>
<p>Modern PVC visiting cards for professionals and businesses.</p>
<Link className="btn-ghost" to="/register">Create Visiting Card <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg></Link>
</div>
</article>
<article className="service-card">
<div aria-hidden="true" className="service-card-media photo-slot">
<img alt="Aadhaar PVC Card" src={customCardsImg} style={{width: "100%"}}/>
</div>
<div className="service-card-body">
<div className="service-icon"><i className="bi bi-gem"></i></div>
<h3>Custom PVC Cards</h3>
<p>Create customized cards for memberships, access, loyalty programs, events, and other requirements.</p>
<Link className="btn-ghost" to="/register">Create Custom Card <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg></Link>
</div>
</article>
</div>
</div>
</section>

<section className="section section--ink" id="how-it-works">
<div className="section-inner">
<div className="section-head reveal">
<span className="section-kicker">The process</span>
<h2>Create your card in four steps</h2>
<p>From a customer's document to a print-ready file, in one guided flow.</p>
</div>
<div className="steps">
<div className="step reveal">
<div className="step-index">
<span className="icon-badge icon-badge-ink"><i className="bi bi-cloud-arrow-up"></i></span>
<span className="step-number">01</span>
</div>
<h3>Upload</h3>
<p>Upload the customer's document or provide the required information directly.</p>
</div>
<div className="step reveal">
<div className="step-index">
<span className="icon-badge icon-badge-ink"><i className="bi bi-search"></i></span>
<span className="step-number">02</span>
</div>
<h3>Verify</h3>
<p>The system extracts available information and the operator reviews and corrects the details.</p>
</div>
<div className="step reveal">
<div className="step-index">
<span className="icon-badge icon-badge-ink"><i className="bi bi-palette"></i></span>
<span className="step-number">03</span>
</div>
<h3>Design</h3>
<p>Choose a card template and add the required information, photo, logo, or QR code.</p>
</div>
<div className="step reveal">
<div className="step-index">
<span className="icon-badge icon-badge-solid"><i className="bi bi-printer"></i></span>
<span className="step-number">04</span>
</div>
<h3>Generate &amp; print</h3>
<p>Preview the final card and generate a high-quality print-ready file.</p>
</div>
</div>
</div>
</section>

<section className="section">
<div className="section-inner platform">
<div className="reveal">
<span className="section-kicker">The platform</span>
<h2>Simple card creation. Professional results.</h2>
<p style={{marginTop: "14px", color: "var(--text-on-paper-dim)", maxWidth: "52ch"}}>Prepare PVC cards without
            complicated design software — from document upload to a print-ready file, in one place.</p>
<ul className="feature-list">
<li><svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M20 6L9 17l-5-5"></path>
</svg> Easy document upload</li>
<li><svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M20 6L9 17l-5-5"></path>
</svg> Information extraction</li>
<li><svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M20 6L9 17l-5-5"></path>
</svg> Manual verification and editing</li>
<li><svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M20 6L9 17l-5-5"></path>
</svg> Professional card templates</li>
<li><svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M20 6L9 17l-5-5"></path>
</svg> Live card preview</li>
<li><svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M20 6L9 17l-5-5"></path>
</svg> Photo upload and adjustment</li>
<li><svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M20 6L9 17l-5-5"></path>
</svg> Logo, QR code &amp; barcode support</li>
<li><svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
<path d="M20 6L9 17l-5-5"></path>
</svg> High-quality PDF, PNG &amp; JPG output</li>
</ul>
<Link className="btn btn-gradient" style={{marginTop: "32px"}} to="/register">
            Start Creating Your Card
            <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg>
</Link>
</div>
<div className="platform-visual reveal">
<div className="platform-visual-bar"><span></span><span></span><span></span></div>
<div className="platform-preview-card">
<img alt="Aadhaar PVC Card" src={aadhaarCardImg} style={{width: "100%"}}/>
</div>
<div className="platform-toolbar"><span></span><span></span><span></span><span></span></div>
</div>
</div>
</section>

<section className="section section--paper-dim">
<div className="section-inner">
<div className="section-head reveal">
<span className="section-kicker">Why IDZEN</span>
<h2>Everything you need for professional PVC cards</h2>
</div>
<div className="why-grid">
<div className="why-item">
<div className="icon-badge"><i className="bi bi-lightning-charge"></i></div>
<h3>Easy to use</h3>
<p>A simple, straightforward card creation process from start to finish.</p>
</div>
<div className="why-item">
<div className="icon-badge"><i className="bi bi-brush"></i></div>
<h3>Professional designs</h3>
<p>Choose from professionally prepared card templates for every card type.</p>
</div>
<div className="why-item">
<div className="icon-badge"><i className="bi bi-stopwatch"></i></div>
<h3>Fast processing</h3>
<p>Less manual data entry means faster card preparation.</p>
</div>
<div className="why-item">
<div className="icon-badge"><i className="bi bi-check2-circle"></i></div>
<h3>Accurate information</h3>
<p>Review and verify extracted information before generating the final card.</p>
</div>
<div className="why-item">
<div className="icon-badge"><i className="bi bi-award"></i></div>
<h3>High-quality output</h3>
<p>Generate high-resolution files suitable for professional PVC card printing.</p>
</div>
<div className="why-item">
<div className="icon-badge"><i className="bi bi-layers"></i></div>
<h3>Flexible designs</h3>
<p>Create different card types from reusable, configurable templates.</p>
</div>
</div>
</div>
</section>

<section className="section section--ink">
<div className="section-inner">
<div className="section-head reveal">
<span className="section-kicker">One platform</span>
<h2>Multiple card solutions</h2>
</div>
<div className="types-grid">
<div className="type-card type-card--1">
<div aria-hidden="true" className="type-card-media photo-slot">
<img alt="Aadhaar PVC Card" src={studentsCardImg} style={{width: "100%"}}/>
</div>
<div className="icon-badge icon-badge-ink"><i className="bi bi-fingerprint"></i></div>
<h3>Identity cards</h3>
<ul>
<li>Aadhaar PVC</li>
<li>Employee ID</li>
<li>Student ID</li>
<li>Membership ID</li>
</ul>
</div>
<div className="type-card type-card--2">
<div aria-hidden="true" className="type-card-media photo-slot">
<img alt="Aadhaar PVC Card" src={visitingCardsImg} style={{width: "100%"}}/>
</div>
<div className="icon-badge icon-badge-ink"><i className="bi bi-postcard"></i></div>
<h3>Business cards</h3>
<ul>
<li>PVC visiting cards</li>
<li>Business cards</li>
<li>Professional cards</li>
</ul>
</div>
<div className="type-card type-card--3">
<div aria-hidden="true" className="type-card-media photo-slot">
<img alt="Aadhaar PVC Card" src={employeeCardImg} style={{width: "100%"}}/>
</div>
<div className="icon-badge icon-badge-ink"><i className="bi bi-diagram-3"></i></div>
<h3>Organization cards</h3>
<ul>
<li>Employee cards</li>
<li>Student cards</li>
<li>Access cards</li>
<li>Membership cards</li>
</ul>
</div>
<div className="type-card type-card--4">
<div aria-hidden="true" className="type-card-media photo-slot">
<img alt="Aadhaar PVC Card" src={customCardsImg} style={{width: "100%"}}/>
</div>
<div className="icon-badge icon-badge-ink"><i className="bi bi-gift"></i></div>
<h3>Custom cards</h3>
<ul>
<li>Loyalty cards</li>
<li>Event cards</li>
<li>Custom PVC cards</li>
</ul>
</div>
</div>
</div>
</section>

<section className="section section--ink">
<div className="section-inner designer">
<div className="reveal">
<span className="section-kicker">The card designer</span>
<h2>Design your card, your way</h2>
<p style={{marginTop: "14px", color: "var(--text-on-ink-dim)", maxWidth: "48ch"}}>Choose a template and customize the
            card according to your requirements — no design software needed.</p>
<div className="designer-features">
<div className="designer-feature">
<div className="designer-feature-icon"><i className="bi bi-input-cursor-text"></i></div>
<div>
<h4>Add information</h4>
<p>Place customer information exactly where you need it.</p>
</div>
</div>
<div className="designer-feature">
<div className="designer-feature-icon"><i className="bi bi-person-square"></i></div>
<div>
<h4>Add photo</h4>
<p>Upload, crop, resize, and position the customer's photo.</p>
</div>
</div>
<div className="designer-feature">
<div className="designer-feature-icon"><i className="bi bi-patch-check"></i></div>
<div>
<h4>Add logo</h4>
<p>Add a company, organization, school, or business logo.</p>
</div>
</div>
<div className="designer-feature">
<div className="designer-feature-icon"><i className="bi bi-qr-code"></i></div>
<div>
<h4>Add QR code</h4>
<p>Generate and place QR codes on supported card designs.</p>
</div>
</div>
<div className="designer-feature">
<div className="designer-feature-icon"><i className="bi bi-upc-scan"></i></div>
<div>
<h4>Add barcode</h4>
<p>Add barcode information for supported applications.</p>
</div>
</div>
<div className="designer-feature">
<div className="designer-feature-icon"><i className="bi bi-eye"></i></div>
<div>
<h4>Live preview</h4>
<p>See how the card will look before generating the final file.</p>
</div>
</div>
</div>
<Link className="btn btn-gradient" style={{marginTop: "36px"}} to="/register">
            Open Card Designer
            <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg>
</Link>
</div>
<div aria-hidden="true" className="designer-canvas reveal">
<div className="designer-canvas-card">
<div className="designer-canvas-photo photo-slot"><i className="bi bi-person-fill"></i></div>
<div className="designer-canvas-lines"><span></span><span></span><span></span></div>
<div className="designer-guide" style={{left: "16px", top: "16px", width: "64px", height: "78px"}}></div>
<div className="designer-handle" style={{left: "16px", top: "16px"}}></div>
<div className="designer-handle" style={{left: "80px", top: "16px"}}></div>
<div className="designer-handle" style={{left: "16px", top: "94px"}}></div>
<div className="designer-handle" style={{left: "80px", top: "94px"}}></div>
<div className="designer-guide" style={{right: "16px", top: "16px", width: "34px", height: "34px"}}></div>
</div>
<div className="designer-rail">
<span className="is-active"></span>
<span><i className="bi bi-type"></i></span>
<span><i className="bi bi-image"></i></span>
<span><i className="bi bi-qr-code"></i></span>
<span><i className="bi bi-square"></i></span>
</div>
</div>
</div>
</section>

<section className="section">
<div className="section-inner output-grid">
<div className="reveal">
<span className="section-kicker">Professional printing</span>
<h2>Ready for professional PVC printing</h2>
<p style={{marginTop: "14px", color: "var(--text-on-paper-dim)", maxWidth: "48ch"}}>Once the design is approved,
            generate a high-quality digital file ready for printing.</p>
<ul className="output-list">
<li><svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
<path d="M4 19V6a2 2 0 012-2h8l6 6v9a2 2 0 01-2 2H6a2 2 0 01-2-2z"></path>
<path d="M14 4v5h5"></path>
</svg> Print-ready PDF</li>
<li><svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
<rect height="18" rx="2" width="18" x="3" y="3"></rect>
<circle cx="9" cy="9" r="2"></circle>
<path d="M21 15l-5-5L5 21"></path>
</svg> High-resolution PNG</li>
<li><svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
<rect height="18" rx="2" width="18" x="3" y="3"></rect>
<circle cx="9" cy="9" r="2"></circle>
<path d="M21 15l-5-5L5 21"></path>
</svg> JPG image export</li>
<li><svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
<path d="M3 15v3a2 2 0 002 2h14a2 2 0 002-2v-3M7 10l5 5 5-5M12 15V3"></path>
</svg> Configurable card dimensions &amp; DPI</li>
</ul>
<Link className="btn btn-gradient" style={{marginTop: "32px"}} to="/register">
            Generate Your Card
            <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg>
</Link>
</div>
<div aria-hidden="true" className="output-stack reveal">
<div className="output-file output-file-1">
<span className="output-file-tag">PNG</span>
<div className="output-file-lines"><span style={{width: "70%"}}></span><span style={{width: "50%"}}></span><span style={{width: "60%"}}></span></div>
</div>
<div className="output-file output-file-2">
<span className="output-file-tag">PDF</span>
<div className="output-file-lines"><span style={{width: "70%"}}></span><span style={{width: "50%"}}></span><span style={{width: "60%"}}></span></div>
</div>
<div className="output-file output-file-3">
<span className="output-file-tag">JPG</span>
<div className="output-file-lines"><span style={{width: "70%"}}></span><span style={{width: "50%"}}></span><span style={{width: "60%"}}></span></div>
</div>
</div>
</div>
</section>

<section className="section section--paper-dim">
<div className="section-inner shop-section">
<div className="reveal">
<span className="section-kicker">For printing businesses</span>
<h2>Built for PVC card printing shops</h2>
<p style={{marginTop: "14px", color: "var(--text-on-paper-dim)", maxWidth: "44ch"}}>IDZEN helps printing shops cut
            repetitive manual work and keep card creation organized, from first upload to final file.</p>
<a className="btn btn-outline" href="#contact" style={{marginTop: "28px"}}>Get Started</a>
</div>
<div className="benefit-grid reveal">
<div className="benefit-item">
<h4>Faster card preparation</h4>
<p>Less manual work per card.</p>
</div>
<div className="benefit-item">
<h4>Reusable templates</h4>
<p>Design once, reuse for every order.</p>
</div>
<div className="benefit-item">
<h4>Customer management</h4>
<p>Keep customer records organized.</p>
</div>
<div className="benefit-item">
<h4>Order management</h4>
<p>Track every order to completion.</p>
</div>
<div className="benefit-item">
<h4>Multiple operators</h4>
<p>Give your whole team access.</p>
</div>
<div className="benefit-item">
<h4>Centralized designs</h4>
<p>One library of approved templates.</p>
</div>
<div className="benefit-item">
<h4>Easy file generation</h4>
<p>Print-ready output in a click.</p>
</div>
<div className="benefit-item">
<h4>Reduced data entry</h4>
<p>Extracted details, not retyped ones.</p>
</div>
</div>
</div>
</section>

<section className="section">
<div className="section-inner">
<div className="section-head reveal">
<span className="section-kicker">Simple workflow</span>
<h2>From document to printed card</h2>
</div>
<div className="workflow-track">
<div className="workflow-node is-accent">
<div className="workflow-dot"><i className="bi bi-cloud-arrow-up"></i></div><span>Upload</span>
</div>
<div className="workflow-connector"></div>
<div className="workflow-node">
<div className="workflow-dot"><i className="bi bi-search"></i></div><span>Verify</span>
</div>
<div className="workflow-connector"></div>
<div className="workflow-node">
<div className="workflow-dot"><i className="bi bi-grid"></i></div><span>Select design</span>
</div>
<div className="workflow-connector"></div>
<div className="workflow-node">
<div className="workflow-dot"><i className="bi bi-sliders"></i></div><span>Customize</span>
</div>
<div className="workflow-connector"></div>
<div className="workflow-node">
<div className="workflow-dot"><i className="bi bi-eye"></i></div><span>Preview</span>
</div>
<div className="workflow-connector"></div>
<div className="workflow-node">
<div className="workflow-dot"><i className="bi bi-gear"></i></div><span>Generate</span>
</div>
<div className="workflow-connector"></div>
<div className="workflow-node is-accent">
<div className="workflow-dot"><i className="bi bi-printer"></i></div><span>Print</span>
</div>
</div>
<p className="workflow-caption">From a customer's document to a print-ready PVC card — everything is managed through
          one simple workflow.</p>
</div>
</section>

<section className="section section--paper-dim" id="about">
<div className="section-inner about-grid">
<div aria-hidden="true" className="about-figure reveal">
<div className="pvc-card pvc-card-1">
<div className="pvc-card-inner">
<div className="pvc-card-row">
<div className="pvc-card-chip"></div>
<div className="pvc-card-qr"></div>
</div>
<div className="pvc-card-lines"><span></span><span></span></div>
</div>
</div>
<div className="pvc-card pvc-card-2">
<div className="pvc-card-inner">
<div className="pvc-card-row">
<div className="pvc-card-photo"></div>
<div className="pvc-card-qr"></div>
</div>
<div className="pvc-card-lines"><span></span><span></span></div>
</div>
</div>
<div className="pvc-card pvc-card-3">
<div className="pvc-card-inner">
<div className="pvc-card-row">
<div className="pvc-card-chip"></div>
</div>
<div className="pvc-card-lines"><span></span><span></span></div>
</div>
</div>
</div>
<div className="about-copy reveal">
<span className="section-kicker">About us</span>
<h2>Your partner for professional PVC card solutions</h2>
<p style={{marginTop: "18px"}}>We provide reliable PVC card printing and digital card preparation for
            individuals, businesses, schools, offices, organizations, and printing centers.</p>
<p>Our goal is to make card creation faster, easier, and more professional through one simple digital
            workflow.</p>
<p>Whether you need a single card or several hundred, IDZEN helps you prepare professional designs that are
            ready for printing.</p>
</div>
</div>
</section>

<section className="section">
<div className="section-inner">
<div className="section-head reveal" style={{maxWidth: "100%", textAlign: "center", marginLeft: "auto", marginRight: "auto"}}>
<span className="section-kicker" style={{justifyContent: "center"}}>Questions</span>
<h2>Frequently asked questions</h2>
</div>
<div className="faq-list">{FAQS.map((item, index) => (
                <div key={item.question} className={"faq-item" + (openFaqIndex === index ? " is-open" : "")}>
                  <button
                    className="faq-question"
                    aria-expanded={openFaqIndex === index}
                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  >
                    {item.question}
                    <span className="faq-icon"></span>
                  </button>
                  <div
                    className="faq-answer"
                    style={{ maxHeight: openFaqIndex === index ? faqHeights.current[index] ?? 400 : 0 }}
                  >
                    <div className="faq-answer-inner" ref={(el) => (faqAnswerRefs.current[index] = el)}>
                      {item.answer}
                    </div>
                  </div>
                </div>
              ))}</div>
</div>
</section>

<section className="section" style={{paddingTop: "0"}}>
<div className="final-cta reveal">
<div className="final-cta-inner">
<h2>Ready to create your PVC card?</h2>
<p>Create professional PVC cards quickly with an easy document-to-design workflow.</p>
<p className="final-cta-flow">Upload → Verify → Design → Generate → Print</p>
<div className="final-cta-actions">
<Link className="btn btn-gradient" to="/register">
              Create Your Card
              <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg>
</Link>
<a className="btn btn-outline" href="#contact">Contact Us</a>
</div>
</div>
</div>
</section>

<section className="section section--paper-dim" id="contact">
<div className="section-inner contact-grid">
<div className="reveal">
<span className="section-kicker">Get in touch</span>
<h2>Need help with your PVC card?</h2>
<p style={{marginTop: "14px", color: "var(--text-on-paper-dim)", maxWidth: "44ch"}}>Reach out for card printing,
            custom designs, bulk orders, and business requirements.</p>
<dl className="contact-list">
<div>
<dt>Phone</dt>
<dd>+91 98665 17527</dd>
</div>
<div>
<dt>WhatsApp</dt>
<dd>+91 98665 17527</dd>
</div>
<div>
<dt>Email</dt>
<dd>info@idzen.com</dd>
</div>
<div>
<dt>Address</dt>
<dd style={{fontFamily: "var(--font-body)", fontWeight: "500", fontSize: "1rem"}}>Your business address</dd>
</div>
</dl>
<div className="contact-actions">
<a className="btn btn-gradient" href="#">
              Chat on WhatsApp
              <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
<path d="M21 11.5a8.5 8.5 0 01-12.4 7.5L3 20l1.1-5.4A8.5 8.5 0 1121 11.5z"></path>
</svg>
</a>
<a className="btn btn-outline" href="#">Call Us</a>
</div>
</div>
<div className="contact-panel reveal">
<h3>Send us a message</h3>
<form onSubmit={handleContactSubmit}>
<div className="form-row">
<label htmlFor="c-name">Name</label>
<input id="c-name" placeholder="Your name" required type="text"/>
</div>
<div className="form-row">
<label htmlFor="c-mobile">Mobile number</label>
<input id="c-mobile" placeholder="10-digit mobile number" required type="tel"/>
</div>
<div className="form-row">
<label htmlFor="c-card">Card type</label>
<select id="c-card">
<option>Aadhaar PVC Card</option>
<option>FSC / Ration Card</option>
<option>Employee ID Card</option>
<option>Student ID Card</option>
<option>Visiting Card</option>
<option>Custom PVC Card</option>
</select>
</div>
<div className="form-row">
<label htmlFor="c-message">Message</label>
<textarea id="c-message" placeholder="Tell us what you need" rows={3}></textarea>
</div>
<button className="btn btn-gradient" style={{width: "100%", justifyContent: "center"}} type="submit" disabled={isContactSent}>{isContactSent ? "Message sent" : "Send Message"}</button>
</form>
</div>
</div>
</section>
</main>

<footer className="site-footer">
<div className="footer-top">
<div className="footer-brand">
<span className="logo" style={{color: "var(--text-on-ink)"}}><img src={idzenIcon} alt="" className="logo-mark" />IDZEN</span>
<p>Professional PVC card printing and digital card creation.</p>
</div>
<div className="footer-col">
<h4>Quick links</h4>
<ul>
<li><a href="#top">Home</a></li>
<li><a href="#services">Services</a></li>
<li><a href="#how-it-works">How It Works</a></li>
<li><a href="#about">About Us</a></li>
<li><a href="#contact">Contact</a></li>
<li><Link to="/shop">Shop</Link></li>
</ul>
</div>
<div className="footer-col">
<h4>Services</h4>
<ul>
<li><a href="#services">Aadhaar PVC Card</a></li>
<li><a href="#services">FSC / Ration Card</a></li>
<li><a href="#services">Employee ID Card</a></li>
<li><a href="#services">Student ID Card</a></li>
<li><a href="#services">Visiting Card</a></li>
<li><a href="#services">Custom PVC Card</a></li>
</ul>
</div>
<div className="footer-col">
<h4>Support</h4>
<ul>
<li><a href="#contact">Contact Us</a></li>
<li><a href="#">WhatsApp</a></li>
<li><a href="#">FAQs</a></li>
<li><a href="#">Terms &amp; Conditions</a></li>
<li><a href="#">Privacy Policy</a></li>
</ul>
</div>
</div>
<div className="footer-bottom">
<span>© 2026 IDZEN. All rights reserved.</span>
<span>Made for professional PVC card printing.</span>
</div>
</footer>

    </div>
  );
}
