#!/usr/bin/env python3
"""
AISurveyApp (ASA) QR Code Generator
Generates QR codes for survey sessions with optional customization
"""

import qrcode
import os
import sys
from datetime import datetime
from urllib.parse import quote

def generate_qr_code(url, session_name="", filename=None, size=10):
    """
    Generate a QR code for ASA survey
    
    Args:
        url: The Vercel app URL (e.g., https://asa-app.vercel.app)
        session_name: Optional session name for filename
        filename: Custom output filename (default: auto-generated)
        size: QR code box size in pixels
    
    Returns:
        Filename of generated QR code
    """
    
    # Validate URL
    if not url.startswith('http'):
        url = 'https://' + url
    
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # High error correction
        box_size=size,
        border=2,
    )
    
    qr.add_data(url)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Determine filename
    if not filename:
        if session_name:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"asa_qr_{session_name}_{timestamp}.png"
        else:
            filename = f"asa_qr_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    
    # Ensure .png extension
    if not filename.endswith('.png'):
        filename += '.png'
    
    # Save image
    img.save(filename)
    
    return filename, url

def generate_batch_qr_codes(base_url, sessions):
    """
    Generate QR codes for multiple sessions
    
    Args:
        base_url: Base Vercel app URL
        sessions: List of session names/codes
    
    Returns:
        List of generated filenames
    """
    generated = []
    
    for session in sessions:
        # The React app reads ?group=XYZ in survey.config.js / SurveyEngine.jsx
        # and pre-fills the registration form's group field. Anything other than
        # the literal key `group` will be silently ignored.
        session_url = f"{base_url}?group={quote(session)}"

        filename, url = generate_qr_code(session_url, session_name=session)
        generated.append({
            'filename': filename,
            'session': session,
            'url': url
        })
        print(f"✓ Generated: {filename} for session '{session}'")
    
    return generated

def generate_printable_sheet(qr_filenames, output_file="asa_qr_codes_printable.html"):
    """
    Generate an HTML sheet with QR codes for printing
    
    Args:
        qr_filenames: List of QR code filenames
        output_file: Output HTML filename
    """
    
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ASA QR Codes - Printable Sheet</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background: white;
                margin: 0;
                padding: 20px;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .header h1 {
                margin: 0;
                color: #2C2C2A;
            }
            .header p {
                color: #888780;
                margin: 5px 0;
            }
            .qr-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 40px;
                margin-bottom: 40px;
            }
            .qr-item {
                text-align: center;
                page-break-inside: avoid;
            }
            .qr-item img {
                width: 250px;
                height: 250px;
                border: 2px solid #D3D1C7;
                padding: 10px;
                background: white;
            }
            .qr-item p {
                margin: 15px 0 5px 0;
                font-weight: bold;
                color: #2C2C2A;
            }
            .qr-item .url {
                font-size: 12px;
                color: #888780;
                word-break: break-all;
            }
            .instructions {
                background: #E1F5EE;
                border-left: 4px solid #0F6E56;
                padding: 15px;
                margin-top: 30px;
                border-radius: 4px;
            }
            @media print {
                body { padding: 0; }
                .qr-grid { gap: 60px; }
                .qr-item img { width: 280px; height: 280px; }
                .instructions { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>AI Literacy Survey - QR Codes</h1>
            <p>Scan these codes to start the ASA survey</p>
            <p>Generated: """ + datetime.now().strftime("%Y-%m-%d %H:%M") + """</p>
        </div>
        
        <div class="qr-grid">
    """
    
    # Add QR code items
    for filename in qr_filenames:
        if isinstance(filename, dict):
            qr_file = filename['filename']
            session = filename.get('session', 'Session')
            url = filename.get('url', '')
        else:
            qr_file = filename
            session = "QR Code"
            url = ""
        
        html_content += f"""
            <div class="qr-item">
                <img src="{qr_file}" alt="QR Code for {session}">
                <p>{session}</p>
                <p class="url">{url}</p>
            </div>
        """
    
    html_content += """
        </div>
        
        <div class="instructions">
            <h3>Instructions for Use:</h3>
            <ul>
                <li>Print this page or display on screen</li>
                <li>Participants scan with mobile camera or QR reader app</li>
                <li>Backup: Share the URL directly if scanning fails</li>
                <li>Test scan before your session</li>
            </ul>
        </div>
    </body>
    </html>
    """
    
    with open(output_file, 'w') as f:
        f.write(html_content)
    
    return output_file

def main():
    """Main CLI interface"""
    
    print("=" * 60)
    print("AISurveyApp (ASA) QR Code Generator")
    print("=" * 60)
    
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  Single QR code:")
        print("    python qr_generator.py https://asa-app.vercel.app")
        print("\n  With Session ID (follows ASA-{IDENTIFIER}-{DATE_OR_NUMBER} convention):")
        print("    python qr_generator.py https://asa-app.vercel.app --session ASA-MORNING-01")
        print("    python qr_generator.py https://asa-app.vercel.app"
              " --session ASA-PRECOURSE-2026-05-25")
        print("    python qr_generator.py https://asa-app.vercel.app --session ASA-SIA-BATCH-2")
        print("\n  Batch generation (one QR per cohort):")
        print("    python qr_generator.py https://asa-app.vercel.app --batch")
        print("\nThe Session ID is passed as ?group=... in the URL and pre-fills")
        print("the Cohort / Session field on the registration form.\n")
        return
    
    base_url = sys.argv[1]
    
    # Check for options
    if '--batch' in sys.argv:
        print("\nBatch QR Code Generation")
        print("Enter session names (one per line, empty line to finish):\n")
        
        sessions = []
        while True:
            session = input(f"Session {len(sessions) + 1}: ").strip()
            if not session:
                break
            sessions.append(session)
        
        if sessions:
            results = generate_batch_qr_codes(base_url, sessions)
            printable = generate_printable_sheet(results)
            print(f"\n✓ Batch complete!")
            print(f"✓ Generated {len(results)} QR codes")
            print(f"✓ Printable sheet: {printable}")
        else:
            print("No sessions entered.")
    
    else:
        # Single QR code
        session_name = ""
        if '--session' in sys.argv:
            idx = sys.argv.index('--session')
            if idx + 1 < len(sys.argv):
                session_name = sys.argv[idx + 1]
        
        filename, url = generate_qr_code(base_url, session_name=session_name)
        
        print(f"\n✓ QR Code generated successfully!")
        print(f"✓ Filename: {filename}")
        print(f"✓ URL encoded: {url}")
        print(f"\nInstructions:")
        print(f"  1. Print or display the QR code")
        print(f"  2. Participants scan with mobile camera")
        print(f"  3. Backup link: {url}")

if __name__ == "__main__":
    main()
