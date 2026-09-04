import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});
const { generateMystery, localizeMystery, maxKillerCount, randomRoleOrder, votingPhase } =
  await vite.ssrLoadModule("/lib/mystery.ts");

after(async () => {
  await vite.close();
});

test("keeps the innocent side larger for every lobby size", () => {
  const expectedLimits = [1, 1, 2, 2, 3, 3, 4, 4];
  for (let players = 3; players <= 10; players += 1) {
    assert.equal(maxKillerCount(players), expectedLimits[players - 3]);
  }
});

test("generates complete cases for every supported team size", () => {
  for (let players = 3; players <= 10; players += 1) {
    for (let killers = 1; killers <= maxKillerCount(players); killers += 1) {
      const mystery = generateMystery(players, killers);
      const guiltyRoles = mystery.roles.filter((role) => role.culprit);

      assert.equal(mystery.roles.length, players);
      assert.equal(guiltyRoles.length, killers);
      assert.equal(
        new Set(mystery.roles.map((role) => role.ability?.id)).size,
        players,
      );
      for (const role of guiltyRoles) {
        assert.equal(role.accomplices?.length ?? 0, killers - 1);
        assert.ok(
          mystery.evidence[3].some((clue) =>
            clue.includes(role.characterName),
          ),
        );
      }
      assert.equal(new Set(randomRoleOrder(players)).size, players);
    }
  }
});

test("avoids recently used structures and settings", () => {
  const history = [];
  for (let run = 0; run < 120; run += 1) {
    const recent = history.slice(0, 60);
    const fingerprints = recent.map((entry) => entry.fingerprint);
    const settings = recent.map((entry) => entry.setting);
    const mystery = generateMystery(10, 4, fingerprints, settings);

    assert.ok(!fingerprints.includes(mystery.fingerprint));
    assert.ok(!settings.slice(0, 5).includes(mystery.setting));
    history.unshift({
      fingerprint: mystery.fingerprint,
      setting: mystery.setting,
    });
  }
});

test("creates a simplified Casual case and preserves the full Detective mode", () => {
  const casual = generateMystery(6, 2, [], [], "casual");
  const detective = generateMystery(6, 2, [], [], "detective");

  assert.equal(casual.mode, "casual");
  assert.equal(casual.evidence.length, 3);
  assert.equal(casual.evidence.flat().length, 3);
  assert.ok(casual.evidence.every((packet) => packet.length === 1));
  assert.ok(casual.roles.every((role) => role.ability === undefined));
  assert.ok(casual.roles.every((role) => role.objective.includes("majority")));
  assert.equal(votingPhase("casual"), 3);

  assert.equal(detective.mode, "detective");
  assert.equal(detective.evidence.length, 4);
  assert.ok(detective.roles.every((role) => role.ability));
  assert.equal(votingPhase("detective"), 4);
});

test("generates a complete Albanian version of every new case", () => {
  for (const mode of ["casual", "detective"]) {
    const english = generateMystery(10, 4, [], [], mode);
    const albanian = localizeMystery(english, "sq");

    assert.notEqual(albanian.title, english.title);
    assert.notEqual(albanian.setting, english.setting);
    assert.equal(albanian.roles.length, english.roles.length);
    assert.equal(albanian.evidence.length, english.evidence.length);
    assert.equal(albanian.timeline.length, english.timeline.length);
    assert.deepEqual(
      albanian.roles.map((role) => role.culprit),
      english.roles.map((role) => role.culprit),
    );
    assert.deepEqual(
      albanian.roles.map((role) => role.characterName),
      english.roles.map((role) => role.characterName),
    );
    assert.ok(albanian.evidence.flat().every((clue) => clue.length > 20));
    assert.ok(albanian.inspiration?.sourceUrl.startsWith("https://www.fbi.gov/"));
  }
});
