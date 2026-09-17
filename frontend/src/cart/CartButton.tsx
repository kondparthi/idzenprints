import { useCart } from "./CartContext";

interface CartButtonProps {
  onClick: () => void;
  className?: string;
}

export default function CartButton({ onClick, className }: CartButtonProps) {
  const { itemCount } = useCart();

  return (
    <button className={"cart-icon-button" + (className ? ` ${className}` : "")} onClick={onClick} aria-label="Open cart">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
      </svg>
      {itemCount > 0 && <span className="cart-icon-badge">{itemCount > 99 ? "99+" : itemCount}</span>}
    </button>
  );
}
