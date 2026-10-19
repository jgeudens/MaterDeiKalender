// @vitest-environment node
import { createRequire } from "node:module";
import { describe, it, expect, vi } from "vitest";

const { handler } = createRequire(import.meta.url)("../netlify/functions/kalender-proxy.js");

const SCHOOL = "https://www.materdeigooreind.be/kalender";
const FEED = "https://outlook.office365.com/owa/calendar/abc@materdei.be/def/calendar.ics";

function vraag(url) {
  return handler({ queryStringParameters: url === undefined ? {} : { url } });
}

function stubUpstream({ status = 200, body = "inhoud", contentType = "text/calendar" } = {}) {
  const fetchMock = vi.fn(async () => ({
    status,
    text: async () => body,
    headers: { get: (naam) => (naam.toLowerCase() === "content-type" ? contentType : null) },
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("kalender-proxy", () => {
  it("weigert een ontbrekende url", async () => {
    expect((await vraag(undefined)).statusCode).toBe(400);
    expect((await vraag("")).statusCode).toBe(400);
    expect((await handler({})).statusCode).toBe(400);
    expect((await handler({ queryStringParameters: null })).statusCode).toBe(400);
  });

  it("weigert een ongeldige url", async () => {
    const r = await vraag("geen url");
    expect(r.statusCode).toBe(400);
    expect(r.body).toContain("Ongeldige");
  });

  it.each([
    ["http i.p.v. https", "http://www.materdeigooreind.be/kalender"],
    ["ander domein", "https://evil.example/kalender"],
    ["domein als prefix", "https://www.materdeigooreind.be.evil.example/kalender"],
    ["subdomein", "https://x.outlook.office365.com/a/calendar.ics"],
    ["zonder www", "https://materdeigooreind.be/kalender"],
    ["ander protocol", "ftp://www.materdeigooreind.be/kalender"],
    ["file-url", "file:///etc/passwd"],
  ])("weigert %s met 403", async (_, url) => {
    const fetchMock = stubUpstream();
    const r = await vraag(url);
    expect(r.statusCode).toBe(403);
    expect(r.body).toContain("domein");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["andere pagina op de schoolsite", "https://www.materdeigooreind.be/admin"],
    ["subpad van /kalender", "https://www.materdeigooreind.be/kalender/x"],
    ["calendar.html op outlook", FEED.replace(".ics", ".html")],
    ["willekeurig outlook-pad", "https://outlook.office365.com/mail/inbox"],
  ])("weigert %s met 403", async (_, url) => {
    const fetchMock = stubUpstream();
    const r = await vraag(url);
    expect(r.statusCode).toBe(403);
    expect(r.body).toContain("pad");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["de kalenderpagina", SCHOOL],
    ["de ICS-feed", FEED],
    ["de ICS-feed met querystring", `${FEED}?x=1`],
  ])("haalt %s op en geeft status, body en content-type door", async (_, url) => {
    const fetchMock = stubUpstream({ status: 200, body: "BEGIN:VCALENDAR", contentType: "text/calendar" });
    const r = await vraag(url);
    expect(fetchMock).toHaveBeenCalledWith(new URL(url).toString());
    expect(r).toEqual({
      statusCode: 200,
      headers: { "Content-Type": "text/calendar" },
      body: "BEGIN:VCALENDAR",
    });
  });

  it("geeft een foutstatus van de bron door", async () => {
    stubUpstream({ status: 404, body: "weg" });
    const r = await vraag(SCHOOL);
    expect(r.statusCode).toBe(404);
    expect(r.body).toBe("weg");
  });

  it("valt terug op text/plain zonder content-type", async () => {
    stubUpstream({ contentType: null });
    expect((await vraag(SCHOOL)).headers["Content-Type"]).toBe("text/plain");
  });

  it("geeft 502 als het ophalen faalt", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("ECONNRESET"))));
    const r = await vraag(SCHOOL);
    expect(r.statusCode).toBe(502);
    expect(r.body).toBe("Ophalen mislukt: ECONNRESET");
  });
});
