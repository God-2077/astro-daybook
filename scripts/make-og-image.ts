import sharp from 'sharp';
import { siteConfig } from '../src/config/site';

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const title = escapeXml(siteConfig.title);
const subtitle = escapeXml(siteConfig.subtitle || '日记与文章');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="page" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#EBEDEE" />
      <stop offset="1" stop-color="#FDFBFB" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#page)" />
  <path d="M0 560h1200" stroke="#E7E0E2" stroke-width="2" />
  <g transform="translate(96 430)" fill="none" stroke="#BE4154" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 120c10-42 36-64 76-64s66 22 76 64" />
    <path d="M26 120V44h120v76M26 84h120M86 24v96" />
    <path d="M44 24h84l14 20H30z" />
  </g>
  <path d="M1024 176l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" fill="#ED6EA0" />
  <text x="96" y="214" fill="#2A2426" font-family="Georgia, 'Songti SC', serif" font-size="92" letter-spacing="2">${title}</text>
  <text x="100" y="278" fill="#6A6065" font-family="Georgia, 'Songti SC', serif" font-size="28" letter-spacing="6">${subtitle}</text>
  <text x="1104" y="532" fill="#BE4154" text-anchor="end" font-family="Georgia, serif" font-size="22">${escapeXml(siteConfig.author)} · est. ${siteConfig.since}</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og-default.png');
console.log('public/og-default.png written');
