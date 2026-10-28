import * as icons from 'lucide-react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import QRCode from 'qrcode';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const ICON_NAMES=['House','Grid2X2','Camera','BriefcaseBusiness','UserRound','ArrowUpRight','ArrowRight','ChevronRight','ChevronDown','Plus','Minus','Check','Search','SlidersHorizontal','Bookmark','ListChecks','MapPin','Map','LocateFixed','Archive','LibraryBig','Package','PackageOpen','Shapes','Tags','History','Bell','ClipboardCheck','ScanLine','Pencil','ImagePlus','CircleAlert','Info','Copy','Printer','ChartNoAxesCombined','Link','UserPlus','Mail','ShieldCheck','Database','Sparkles','RotateCcw','LogOut','Download','Upload','FolderOpen','FileSpreadsheet','Globe','Server','CameraOff'];
const ALIASES={House:'Home',BriefcaseBusiness:'Briefcase',CircleAlert:'AlertCircle',ChartNoAxesCombined:'LineChart'};
for(const name of ICON_NAMES){
  const component=icons[ALIASES[name]??name];
  if(!component)throw new Error(`Missing Lucide icon: ${name}`);
  const file=name.replace(/([a-z0-9])([A-Z])/g,'$1-$2').replace(/([A-Z])([A-Z][a-z])/g,'$1-$2').toLowerCase().replace('grid2-x2','grid-2x2');
  writeFileSync(`${ROOT}assets/icons/${file}.svg`,renderToStaticMarkup(createElement(component,{color:'#22735b',size:24,strokeWidth:1.7})));
}
writeFileSync(`${ROOT}assets/label-qr.svg`,await QRCode.toString('https://example.invalid/visual-label',{type:'svg',margin:0,color:{dark:'#243b33',light:'#ffffff'}}));
console.log(`Generated ${ICON_NAMES.length} Lucide icons and one non-production QR example.`);
