import { describe, expect, it, vi } from "vitest";

import { downloadTextFile, parseCsvText, rowsToCsv } from "./csv";

describe("parseCsvText", () => {
  it("returns empty headers and rows for blank input", () => {
    expect(parseCsvText("")).toEqual({ headers: [], rows: [] });
    expect(parseCsvText("   \n  \n")).toEqual({ headers: [], rows: [] });
  });

  it("parses a simple two-line CSV", () => {
    const { headers, rows } = parseCsvText("a,b,c\n1,2,3");
    expect(headers).toEqual(["a", "b", "c"]);
    expect(rows).toEqual([["1", "2", "3"]]);
  });

  it("handles CRLF line endings", () => {
    const { headers, rows } = parseCsvText("x,y\r\np,q");
    expect(headers).toEqual(["x", "y"]);
    expect(rows).toEqual([["p", "q"]]);
  });

  it("handles quoted fields with commas", () => {
    const { headers, rows } = parseCsvText('id,note\n1,"hello, world"');
    expect(headers).toEqual(["id", "note"]);
    expect(rows).toEqual([["1", "hello, world"]]);
  });
});

describe("rowsToCsv", () => {
  it("joins rows with newlines and cells with commas", () => {
    expect(
      rowsToCsv([
        ["a", "b"],
        ["1", "2"],
      ])
    ).toBe("a,b\n1,2");
  });

  it("quotes cells that contain commas", () => {
    expect(rowsToCsv([["a", "b, c"]])).toBe('a,"b, c"');
  });

  it("escapes double quotes in cells", () => {
    expect(rowsToCsv([['say "hi"']])).toBe('"say ""hi"""');
  });
});

describe("downloadTextFile", () => {
  it("creates a blob URL, triggers download click, and revokes the URL", () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const remove = vi
      .spyOn(HTMLAnchorElement.prototype, "remove")
      .mockImplementation(() => {});
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const createUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock");

    downloadTextFile("out.csv", "x,y");

    expect(createUrl).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith("blob:mock");

    click.mockRestore();
    remove.mockRestore();
    revoke.mockRestore();
    createUrl.mockRestore();
  });
});
