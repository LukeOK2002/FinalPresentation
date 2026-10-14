/* "Conclusions" slide: one bullet per click. */

import { createStepper, EASE } from "./stepper.js";

const INITIAL = { b1: { op: 0, ty: 16 }, b2: { op: 0, ty: 16 }, b3: { op: 0, ty: 16 } };
const TIMELINES = [null, ...["b1", "b2", "b3"].map((b) => [[b, { op: 1, ty: 0 }, 0, 600, EASE]])];

export const initTeConclude = () => createStepper(document.getElementById("te-conclude"), INITIAL, TIMELINES);
