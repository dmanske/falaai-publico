import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { acharEntrada, rotuloTransporte } from "./microfones.ts";

const entrada = (nome: string, transporte: string, padrao = false) => ({ nome, uid: nome, transporte, padrao, vivo: true });
const entradas = [
  entrada("Microfone do iPhone de Daniel Manske", "iphone"),
  entrada("Microfone (MacBook Air)", "embutido", true),
  entrada("AirPods Pro", "bluetooth"),
];

describe("acharEntrada", () => {
  it("igualdade", () => assert.equal(acharEntrada("AirPods Pro", entradas)?.transporte, "bluetooth"));
  it("o rótulo do navegador começa com o nome", () => {
    assert.equal(acharEntrada("Microfone (MacBook Air) (Built-in)", entradas)?.transporte, "embutido");
  });
  it("o rótulo do navegador contém o nome", () => {
    assert.equal(acharEntrada("Dispositivo: AirPods Pro de Daniel", entradas)?.transporte, "bluetooth");
  });
  it("ignora maiúsculas", () => assert.equal(acharEntrada("airpods pro", entradas)?.nome, "AirPods Pro"));
  it("prefere o nome mais longo quando vários servem", () => {
    const lista = [entrada("USB", "usb"), entrada("USB Audio Pro", "usb")];
    assert.equal(acharEntrada("USB Audio Pro", lista)?.nome, "USB Audio Pro");
    assert.equal(acharEntrada("USB Audio Pro 2", lista)?.nome, "USB Audio Pro");
  });
  it("sem correspondência ou rótulo vazio devolve null", () => {
    assert.equal(acharEntrada("Outro", entradas), null);
    assert.equal(acharEntrada("", entradas), null);
  });
});

describe("rotuloTransporte", () => {
  it("traduz os tipos conhecidos", () => {
    assert.equal(rotuloTransporte("embutido"), "embutido");
    assert.equal(rotuloTransporte("bluetooth"), "Bluetooth");
    assert.equal(rotuloTransporte("iphone"), "iPhone");
  });
  it("tipo desconhecido não mostra nada", () => {
    assert.equal(rotuloTransporte("desconhecido"), null);
    assert.equal(rotuloTransporte(undefined), null);
  });
});
