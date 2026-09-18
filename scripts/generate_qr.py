"""
Script to generate high-resolution, branded QR codes for DIGITAL ECO MANAYA website.
Generates:
1. assets/website-qr.png - Clean high-res standalone QR code with embedded logo
2. assets/website-qr-card.png - Full branded poster/card ready for print or sharing
"""

import os
import qrcode
from PIL import Image, ImageDraw, ImageFont

WEBSITE_URL = "https://digital-eco-manaya.vercel.app/"
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets")

def create_standalone_qr():
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=24,
        border=3,
    )
    qr.add_data(WEBSITE_URL)
    qr.make(fit=True)

    # Base QR Code with theme color
    qr_img = qr.make_image(fill_color="#064e3b", back_color="#ffffff").convert("RGBA")
    qr_w, qr_h = qr_img.size

    # Load logo to place in center
    logo_path = os.path.join(ASSETS_DIR, "logo-icon.png")
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        
        # Logo size: ~22% of QR width for reliable scannability
        target_logo_size = int(qr_w * 0.22)
        logo = logo.resize((target_logo_size, target_logo_size), Image.Resampling.LANCZOS)
        
        # Create circular background badge for logo
        badge_padding = int(target_logo_size * 0.16)
        badge_size = target_logo_size + (badge_padding * 2)
        
        badge = Image.new("RGBA", (badge_size, badge_size), (0, 0, 0, 0))
        badge_draw = ImageDraw.Draw(badge)
        
        # White circle background
        badge_draw.ellipse(
            [0, 0, badge_size - 1, badge_size - 1],
            fill="#ffffff",
            outline="#10b981",
            width=int(qr_w * 0.008)
        )
        
        # Paste logo centered inside the badge
        badge.paste(logo, (badge_padding, badge_padding), mask=logo)
        
        # Center badge on QR code
        pos = ((qr_w - badge_size) // 2, (qr_h - badge_size) // 2)
        qr_img.paste(badge, pos, mask=badge)

    out_path = os.path.join(ASSETS_DIR, "website-qr.png")
    qr_img.save(out_path, "PNG", dpi=(300, 300))
    print(f"Generated standalone QR code: {out_path} ({qr_img.size[0]}x{qr_img.size[1]})")
    return qr_img

def create_branded_card(qr_img):
    card_w, card_h = 1080, 1540
    # Rich deep botanical background
    card = Image.new("RGBA", (card_w, card_h), (6, 28, 20, 255))
    draw = ImageDraw.Draw(card)

    # Subtle inner glowing border
    container_margin = 40
    draw.rounded_rectangle(
        [container_margin, container_margin, card_w - container_margin, card_h - container_margin],
        radius=32,
        fill=(10, 39, 29, 255),
        outline=(16, 185, 129, 255),
        width=3
    )

    # Top accent bar
    draw.rounded_rectangle(
        [container_margin + 60, container_margin + 6, card_w - container_margin - 60, container_margin + 12],
        radius=3,
        fill=(52, 211, 153, 255)
    )

    # Fonts with Sinhala and English support
    def get_nirmala_font(size, bold=False):
        fpath = "C:/Windows/Fonts/NirmalaB.ttf" if bold else "C:/Windows/Fonts/Nirmala.ttf"
        if os.path.exists(fpath):
            try:
                return ImageFont.truetype(fpath, size)
            except Exception:
                pass
        return ImageFont.load_default()

    def get_latin_font(size, bold=False):
        for fname in ["segoeuib.ttf" if bold else "segoeui.ttf", "arialbd.ttf" if bold else "arial.ttf"]:
            p = os.path.join("C:/Windows/Fonts", fname)
            if os.path.exists(p):
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    pass
        return ImageFont.load_default()

    font_uni = get_latin_font(24, bold=True)
    font_brand = get_latin_font(52, bold=True)
    font_sub = get_latin_font(26, bold=False)
    font_cta_en = get_latin_font(28, bold=True)
    font_cta_si = get_nirmala_font(27, bold=True)
    font_url = get_latin_font(26, bold=True)
    font_tag = get_latin_font(22, bold=True)
    font_footer = get_latin_font(21, bold=False)

    # Header section with Logo
    logo_path = os.path.join(ASSETS_DIR, "logo-icon.png")
    header_y = 100
    if os.path.exists(logo_path):
        top_logo = Image.open(logo_path).convert("RGBA")
        top_logo = top_logo.resize((100, 100), Image.Resampling.LANCZOS)
        card.paste(top_logo, (card_w // 2 - 50, header_y), mask=top_logo)
        header_y += 115

    # University Name
    uni_text = "SABARAGAMUWA UNIVERSITY OF SRI LANKA"
    draw.text((card_w // 2, header_y), uni_text, font=font_uni, fill=(167, 243, 208, 255), anchor="mm")
    header_y += 45

    # Title: DIGITAL ECO MANAYA
    draw.text((card_w // 2, header_y), "DIGITAL ECO MANAYA", font=font_brand, fill=(255, 255, 255, 255), anchor="mm")
    header_y += 42

    # Subtitle
    draw.text((card_w // 2, header_y), "Campus Botanical Mapping & Tree Monitoring Platform", font=font_sub, fill=(110, 231, 183, 255), anchor="mm")
    header_y += 55

    # QR Code White Frame Card
    qr_display_size = 620
    qr_card_padding = 24
    qr_box_x1 = (card_w - qr_display_size) // 2
    qr_box_y1 = header_y
    qr_box_x2 = qr_box_x1 + qr_display_size
    qr_box_y2 = qr_box_y1 + qr_display_size

    # Outer glow / shadow effect for QR card
    for g in range(8, 0, -2):
        alpha = int(25 * (8 - g) / 8)
        draw.rounded_rectangle(
            [qr_box_x1 - g, qr_box_y1 - g, qr_box_x2 + g, qr_box_y2 + g],
            radius=24 + g,
            outline=(16, 185, 129, alpha),
            width=2
        )

    # Pure white card background
    draw.rounded_rectangle(
        [qr_box_x1, qr_box_y1, qr_box_x2, qr_box_y2],
        radius=24,
        fill=(255, 255, 255, 255),
        outline=(209, 250, 229, 255),
        width=2
    )

    resized_qr = qr_img.resize((qr_display_size - (qr_card_padding * 2), qr_display_size - (qr_card_padding * 2)), Image.Resampling.LANCZOS)
    card.paste(resized_qr, (qr_box_x1 + qr_card_padding, qr_box_y1 + qr_card_padding), mask=resized_qr)

    below_qr_y = qr_box_y2 + 48

    # Scan CTA in English
    draw.text((card_w // 2, below_qr_y), "SCAN WITH SMARTPHONE CAMERA", font=font_cta_en, fill=(52, 211, 153, 255), anchor="mm")
    below_qr_y += 40

    # Scan CTA in Sinhala
    draw.text((card_w // 2, below_qr_y), "ස්මාර්ට් දුරකථනයෙන් Scan කර වෙබ් අඩවියට පිවිසෙන්න", font=font_cta_si, fill=(226, 232, 240, 255), anchor="mm")
    below_qr_y += 55

    # URL Pill Container
    url_text = "digital-eco-manaya.vercel.app"
    pill_w = 760
    pill_h = 56
    pill_x1 = (card_w - pill_w) // 2
    pill_y1 = below_qr_y
    pill_x2 = pill_x1 + pill_w
    pill_y2 = pill_y1 + pill_h

    draw.rounded_rectangle([pill_x1, pill_y1, pill_x2, pill_y2], radius=28, fill=(19, 78, 64, 255), outline=(52, 211, 153, 255), width=2)
    draw.text((card_w // 2, pill_y1 + (pill_h // 2)), f"https://{url_text}", font=font_url, fill=(255, 255, 255, 255), anchor="mm")
    below_qr_y += 90

    # Feature tags
    features_text = "• Tree Database    • GPS GIS Map    • Carbon Tracker    • Smart QR Badges"
    draw.text((card_w // 2, below_qr_y), features_text, font=font_tag, fill=(167, 243, 208, 255), anchor="mm")

    # Footer note
    footer_text = "Faculty of Management Studies • EcoBusiness Management • SUSL"
    draw.text((card_w // 2, card_h - container_margin - 38), footer_text, font=font_footer, fill=(110, 231, 183, 255), anchor="mm")

    out_card_path = os.path.join(ASSETS_DIR, "website-qr-card.png")
    card.save(out_card_path, "PNG", dpi=(300, 300))
    print(f"Generated branded card: {out_card_path} ({card_w}x{card_h})")

if __name__ == "__main__":
    qr = create_standalone_qr()
    create_branded_card(qr)
