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
        slug: "aadhaar-services",
        label: "Aadhaar Services",
        icon: "fingerprint",
        route: "/member/cards/aadhaar-pvc",
        description: "Aadhaar PVC card generation, corrections, and re-KYC in one place.",
      },
      {
        slug: "print-bucket",
        label: "Print bucket",
        icon: "bucket",
        route: "/member/print-bucket",
        description: "",
      },
      {
        slug: "print-cards",
        label: "Print cards",
        icon: "printer",
        route: "/member/print-cards",
        description: "",
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
