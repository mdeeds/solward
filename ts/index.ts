import { Audio } from "./audio";
import { Debug } from "./debug";
import { Debug2 } from "./debug2";
import { Debug3 } from "./debug3";
import { Debug4 } from "./debug4";
import { Debug5 } from "./debug5";
import { Debug6 } from "./debug6";
import { VR } from "./vr";

const sp = new URL(document.URL).searchParams;

if (sp.get('debug')) {
  switch (sp.get('debug')) {
    case '2': new Debug2(); break;
    case '3': new Debug3(); break;
    case '4': new Debug4(); break;
    case '5': new Debug5(); break;
    case '6': new Debug6(); break;
    default: new Debug(); break;
  }
} else if (sp.get('audio')) {
  Audio.make();
} else {
  VR.make();
}
