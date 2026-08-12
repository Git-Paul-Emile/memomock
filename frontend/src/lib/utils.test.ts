import { describe, expect, it } from "vitest";

import { cn, formatFileSize, getInitials } from "@/lib/utils";

describe("cn", () => {
  it("résout les conflits de classes Tailwind en gardant la dernière (ex : p-2 puis p-4 -> p-4)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("ignore les valeurs falsy (undefined, false, null) comme le permet clsx", () => {
    expect(cn("text-sm", undefined, false, null, "font-medium")).toBe("text-sm font-medium");
  });
});

describe("formatFileSize", () => {
  it("affiche les octets tels quels sous 1024 o", () => {
    expect(formatFileSize(512)).toBe("512 o");
  });

  it("convertit en Ko avec une décimale entre 1 Ko et 1 Mo", () => {
    expect(formatFileSize(2048)).toBe("2.0 Ko");
  });

  it("convertit en Mo au-delà d'1 Mo", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 Mo");
  });
});

describe("getInitials", () => {
  it("retourne les initiales (prénom puis nom) en majuscules", () => {
    expect(getInitials("dupont", "marie")).toBe("MD");
  });
});
