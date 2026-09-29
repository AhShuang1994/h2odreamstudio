import { site } from "@/content/site";

/**
 * IG / FB 图标，手机浮动菜单和页脚共用。页脚多一颗 WhatsApp，
 * 菜单不要：菜单正下方就是 WhatsAppFab。
 * 只有图标没有字，所以每颗都给 aria-label，点击区 44px。
 */
export function SocialLinks({
  onClick,
  className = "",
  whatsapp = false,
}: {
  onClick?: () => void;
  className?: string;
  whatsapp?: boolean;
}) {
  const item = "flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink";

  return (
    <div className={`flex items-center ${className}`}>
      {whatsapp && (
        <a href={site.waLink()} target="_blank" rel="noopener noreferrer" onClick={onClick} aria-label={`WhatsApp ${site.whatsappDisplay}`} className={item}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
            <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
          </svg>
        </a>
      )}
      <a href={site.instagram} target="_blank" rel="noopener noreferrer" onClick={onClick} aria-label="Instagram" className={item}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </a>
      <a href={site.facebook} target="_blank" rel="noopener noreferrer" onClick={onClick} aria-label="Facebook" className={item}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      </a>
    </div>
  );
}
