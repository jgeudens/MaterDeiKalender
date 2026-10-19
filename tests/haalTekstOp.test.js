import { describe, it, expect } from "vitest";
import { haalTekstOp } from "../public/js/haalTekstOp.js";
import { respons, stubFetch } from "./helpers.js";

const URL_DOEL = "https://voorbeeld.test/pad?a=1&b=2";
const PROXY = "/api/kalender-proxy";
const PROXY_URL = `${PROXY}?url=${encodeURIComponent(URL_DOEL)}`;

describe("haalTekstOp", () => {
  it("haalt rechtstreeks op als dat lukt, zonder cache", async () => {
    const fetchMock = stubFetch(() => respons("direct"));
    await expect(haalTekstOp(URL_DOEL, PROXY, "iets")).resolves.toBe("direct");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(URL_DOEL, { cache: "no-store" });
  });

  it("valt terug op de proxy bij een HTTP-fout", async () => {
    const fetchMock = stubFetch((url) => (url === URL_DOEL ? respons("", 500) : respons("via proxy")));
    await expect(haalTekstOp(URL_DOEL, PROXY, "iets")).resolves.toBe("via proxy");
    expect(fetchMock).toHaveBeenNthCalledWith(2, PROXY_URL, { cache: "no-store" });
  });

  it("valt terug op de proxy bij een netwerk-/CORS-fout", async () => {
    stubFetch((url) => {
      if (url === URL_DOEL) throw new TypeError("Failed to fetch");
      return respons("via proxy");
    });
    await expect(haalTekstOp(URL_DOEL, PROXY, "iets")).resolves.toBe("via proxy");
  });

  it("valt terug op de proxy als het lezen van de body faalt", async () => {
    stubFetch((url) => {
      if (url === URL_DOEL) {
        return { ok: true, status: 200, text: async () => Promise.reject(new Error("afgebroken")) };
      }
      return respons("via proxy");
    });
    await expect(haalTekstOp(URL_DOEL, PROXY, "iets")).resolves.toBe("via proxy");
  });

  it("meldt beide oorzaken als ook de proxy faalt", async () => {
    stubFetch((url) => (url === URL_DOEL ? respons("", 404) : respons("", 403)));
    await expect(haalTekstOp(URL_DOEL, PROXY, "de feed")).rejects.toThrow(
      "Ophalen van de feed via proxy mislukt (HTTP 403). Directe fout: HTTP 404"
    );
  });

  it("laat een netwerkfout van de proxy door", async () => {
    stubFetch(() => {
      throw new TypeError("offline");
    });
    await expect(haalTekstOp(URL_DOEL, PROXY, "iets")).rejects.toThrow("offline");
  });
});
