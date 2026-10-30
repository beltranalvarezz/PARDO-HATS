// Todo Three.js que usa la intro, expuesto en una variable global para el HTML sin conexión
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
window.__PARDO = { THREE, RoomEnvironment, POST: [{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }] };
