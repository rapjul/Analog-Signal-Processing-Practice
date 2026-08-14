#!/usr/bin/env bash
#
# scripts/generate-maskable-svg.sh
#
# Generates the PWA maskable SVG icon from the standard PWA SVG icon.
#
# This script uses Perl and standard Shell utilities to perform the transformation.
#

set -euo pipefail

# Define variables for paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SOURCE_SVG="${ROOT_DIR}/src/lib/assets/favicon.svg"
if [ ! -f "${SOURCE_SVG}" ]; then
    SOURCE_SVG="${ROOT_DIR}/static/favicon.svg"
fi

if [ ! -f "${SOURCE_SVG}" ]; then
    echo "Error: Source SVG not found at ${SOURCE_SVG}" >&2
    exit 1
fi

STATIC_DIR="${ROOT_DIR}/static"
STATIC_ICONS_DIR="${STATIC_DIR}/icons"
PUBLIC_ICONS_DIR="${ROOT_DIR}/public/icons"

mkdir -p "${STATIC_DIR}" "${STATIC_ICONS_DIR}" "${PUBLIC_ICONS_DIR}"

TARGET_SVG="${STATIC_DIR}/favicon-maskable.svg"

echo "Reading source SVG: ${SOURCE_SVG}"

# 1. Extract the <defs> block content
DEFS_CONTENT=$(perl -0777 -ne '
    if (/<defs\b[^>]*>(.*?)<\/defs>/s) { print $1 }
' "${SOURCE_SVG}")

# 2. Extract background fill color from the background rect
BG_COLOR=$(perl -0777 -ne 'print $1 if /<rect[^>]*fill="([^"]*)"/s' "${SOURCE_SVG}" | head -1)
# Fallback if not found
BG_COLOR="${BG_COLOR:-#0f172a}"

# 3. Extract inner elements (excluding defs, sodipodi metadata, background rect, and comments)
INNER_CONTENT=$(perl -0777 -ne '
    if (/<svg\b[^>]*>(.*?)<\/svg>/s) { $c = $1 }
    # Strip <defs> blocks
    $c =~ s/<defs\b[^>]*>.*?<\/defs>\s*//gsi;
    $c =~ s/<defs\b[^>]*\/>\s*//gi;
    # Strip sodipodi editor metadata (self-closing and open+close forms)
    $c =~ s/<sodipodi:namedview[^>]*>.*?<\/sodipodi:namedview>\s*//gsi;
    $c =~ s/<sodipodi:namedview[^>]*\/>\s*//gi;
    # Strip background rect (rounded rect with rx or ry, or id="base")
    $c =~ s/<rect[^>]*(?:rx|ry|id="base")[^>]*\/>\s*//gsi;
    # Strip editor-specific attributes (inkscape, sodipodi)
    $c =~ s/\s*inkscape:\w+="[^"]*"//gi;
    $c =~ s/\s*sodipodi:\w+="[^"]*"//gi;
    # Strip XML comments
    $c =~ s/<!--.*?-->\s*//gs;
    print $c;
' "${SOURCE_SVG}")

# 4. Format inner content with indents
FORMATTED_CONTENT="        ${INNER_CONTENT//$'\n'/$'\n'        }"

# 5. Conditionally include defs block only if it has content
DEFS_BLOCK=""
if [ -n "${DEFS_CONTENT}" ]; then
    DEFS_BLOCK="    <defs>
        ${DEFS_CONTENT}
    </defs>"
fi

# 6. Generate target file
cat <<EOF >"${TARGET_SVG}"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-label="maskable icon">
    <!--
        Maskable Icon generated from standard icon. See scripts/generate-maskable-svg.sh.
            - Original content scaled to 72% and centered within maskable safe area
            - Full bleed background added to cover OS maskable safe areas
            - Rounded background removed to allow OS mask to define shape

            - Note: This file is programmatically generated. Do not edit directly.
            - To modify, edit src/lib/assets/favicon.svg and re-run scripts/generate-pwa-assets.sh
    -->
${DEFS_BLOCK}
    <!-- Full bleed square background to cover OS maskable safe areas -->
    <rect x="0" y="0" width="64" height="64" fill="${BG_COLOR}" />

    <!--
        Programmatically generated group content:
        - Scaled to 72% around center (32, 32) to fit within maskable safe zone (80% diameter circle)
    -->
    <g transform="translate(32,32) scale(0.72) translate(-32,-32)">
${FORMATTED_CONTENT}
    </g>
</svg>
EOF

cp "${TARGET_SVG}" "${STATIC_ICONS_DIR}/favicon-maskable.svg"
cp "${TARGET_SVG}" "${PUBLIC_ICONS_DIR}/favicon-maskable.svg"

echo "Successfully generated maskable SVG: ${TARGET_SVG}"
