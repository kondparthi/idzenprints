/**
 * The member sidebar's full structure — matches the reference
 * platform's breadth (Govt. Services, Print Services, PVC Delivery,
 * Become Vendor, Statement section, etc.), most of which are static
 * placeholders for now per the "design first, dynamic after"
 * sequencing. Real, working pages set `route`; everything else
 * resolves through /member/section/:slug using this same config, so
 * adding a genuinely built page later is just adding a `route` here —
 * no sidebar rewiring needed.
 */
export interface SidebarItem {
  slug: string;
  label: string;
  icon: string; // key into NAV_ICONS
  route?: string; // real page, if built
  badge?: "new";
  description: string; // shown on the placeholder page until `route` exists
}

export interface SidebarSection {
  heading?: string;
  items: SidebarItem[];
}

export const MEMBER_SIDEBAR: SidebarSection[] = [
  {
    items: [
      { slug: "dashboard", label: "Dashboard", icon: "dashboard", route: "/member/dashboard", description: "" },
      {
        slug: "offer-zone",
        label: "Offer Zone",
        icon: "gift",
        description: "Bundle deals and limited-time offers on card generation credits will appear here.",
      },
    ],
  },
  {
    heading: "Services",
    items: [
      {
        slug: "govt-services",
        label: "Govt. Services",
        icon: "bank",
        description: "Government document services — Aadhaar, PAN, Voter ID, and more — organized by state.",
      },
      {
        slug: "print-services",
        label: "Print Services",
        icon: "printer",
        description: "Browse every printable card and document type IDZEN supports, grouped by category.",
      },
      {
        slug: "aadhaar-services",
        label: "Aadhaar Services",
        icon: "fingerprint",
        route: "/member/cards/aadhaar-pvc",
        description: "Aadhaar PVC card generation, corrections, and re-KYC in one place.",
      },
      {
        slug: "pvc-delivery",
        label: "PVC Delivery",
        icon: "truck",
        description: "Get your printed card delivered to your doorstep — courier tracking and delivery options.",
      },
      {
        slug: "pvc-maker",
        label: "PVC Maker",
        icon: "cardPlus",
        description: "Design and generate a fully custom PVC card from your own template.",
      },
      {
        slug: "pan-services",
        label: "PAN Services",
        icon: "creditCard",
        description: "New PAN applications, corrections, and instant e-PAN downloads.",
      },
      {
        slug: "become-vendor",
        label: "Become Vendor",
        icon: "handshake",
        badge: "new",
        description: "Turn your own service access into a business — process applications from other agents.",
      },
      {
        slug: "buy-sale",
        label: "Buy / Sale",
        icon: "cart",
        description: "A marketplace for buying and selling service credits, devices, and accessories.",
      },
      {
        slug: "msme-services",
        label: "MSME Services",
        icon: "briefcase",
        badge: "new",
        description: "MSME/Udyam registration and related small-business certification services.",
      },
      {
        slug: "open-savings",
        label: "Open Savings A/c",
        icon: "piggyBank",
        description: "Help your customers open a savings account directly through your dashboard.",
      },
      {
        slug: "e-governance",
        label: "E-Governance",
        icon: "globe",
        description: "A directory of e-governance portals and services available through IDZEN.",
      },
      {
        slug: "govt-job-alerts",
        label: "Govt. Job Alerts",
        icon: "bell",
        description: "Stay updated on government job notifications relevant to your customers.",
      },
    ],
  },
  {
    heading: "Statement",
    items: [
      {
        slug: "credit-history",
        label: "Credit History",
        icon: "clock",
        route: "/member/credit-history",
        description: "",
      },
      {
        slug: "pending-txns",
        label: "Pending Txns",
        icon: "hourglass",
        description: "Transactions that are still processing will show up here until they settle.",
      },
    ],
  },
  {
    heading: "Help",
    items: [
      {
        slug: "my-subscription",
        label: "My Subscription",
        icon: "shield",
        route: "/member/subscription",
        description: "",
      },
      { slug: "profile", label: "Profile", icon: "user", route: "/member/profile", description: "" },
      {
        slug: "training-videos",
        label: "Training Videos",
        icon: "video",
        description: "Step-by-step video guides for every service, in multiple languages.",
      },
      {
        slug: "pricing",
        label: "Pricing",
        icon: "tag",
        description: "The full, up-to-date price list for every service on the platform.",
      },
      {
        slug: "support",
        label: "Support",
        icon: "headset",
        description: "Reach our support team by phone, WhatsApp, or a support ticket.",
      },
    ],
  },
];

export function findSidebarItem(slug: string): SidebarItem | undefined {
  for (const section of MEMBER_SIDEBAR) {
    const found = section.items.find((item) => item.slug === slug);
    if (found) return found;
  }
  return undefined;
}
