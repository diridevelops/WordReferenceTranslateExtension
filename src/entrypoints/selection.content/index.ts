import { defineContentScript } from "wxt/utils/define-content-script";
import "@/ui/styles/in-page/in-page-popup-base.css";
import { InPageController } from "./controller";

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  registration: "runtime",
  runAt: "document_idle",
  main() {
    const controller = new InPageController();
    void controller.init();
  },
});
