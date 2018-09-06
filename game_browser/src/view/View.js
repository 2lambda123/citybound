import { vec3, mat4, quat } from 'gl-matrix';
import Mousetrap from 'mousetrap';
import update from 'immutability-helper';

export const initialState = {
    eye: [-150, -150, 150],
    target: [0, 0, 0],
    verticalFov: 0.3 * Math.PI,
    rotating: false,
    zooming: false,
}

export const settingSpec = {
    rotateKey: { default: 'alt', description: "Rotation Key" },
    rotateXSensitivity: { default: 0.01, min: -0.5, max: 0.5, step: 0.01, description: "Rotate sensitivity ↔︎" },
    rotateYSensitivity: { default: -0.01, min: -0.5, max: 0.5, step: 0.01, description: "Rotate sensitivity ↕︎" },
    panXSensitivity: { default: -1, min: -10, max: 10, step: 0.1, description: "Pan sensitivity ↔︎" },
    panYSensitivity: { default: -1, min: -10, max: 10, step: 0.1, description: "Pan sensitivity ↕︎" },
    zoomSensitivity: { default: -5, min: -10, max: 10, step: 0.1, description: "Zoom sensitivity" },
    pinchToZoom: { default: true, description: "Enable Pinch/Ctrl‑To‑Zoom" },
}

export function bindInputs(state, setState) {
    const inputActions = {
        "startRotateEye": () => setState(oldState => update(oldState, {
            view: { rotating: { $set: true } }
        })),
        "stopRotateEye": () => setState(oldState => update(oldState, {
            view: { rotating: { $set: false } }
        })),
    };

    Mousetrap.bind(state.settings.view.rotateKey, inputActions["startRotateEye"], 'keydown');
    Mousetrap.bind(state.settings.view.rotateKey, inputActions["stopRotateEye"], 'keyup');
}

export function onWheel(e, state, setState) {
    const { eye, target } = state.view;

    if (state.view.rotating) {
        const eyeRotatedHorizontal = vec3.rotateZ(
            vec3.create(),
            eye,
            target,
            e.deltaX * state.settings.view.rotateXSensitivity
        );

        const forward = vec3.sub(vec3.create(), target, eyeRotatedHorizontal);
        forward[2] = 0;
        vec3.normalize(forward, forward);
        const sideways = vec3.rotateZ(vec3.create(), forward, vec3.create(), Math.PI / 2.0);

        const verticalRotation = quat.setAxisAngle(
            quat.create(),
            sideways,
            e.deltaY * state.settings.view.rotateYSensitivity
        );

        const eyeRotatedBoth = vec3.transformQuat(
            vec3.create(),
            eyeRotatedHorizontal,
            verticalRotation
        );

        if (eyeRotatedBoth[2] > 10 && vec3.dot(forward, vec3.sub(vec3.create(), target, eyeRotatedBoth)) > 0) {
            setState(oldState => ({
                view: Object.assign(oldState.view, {
                    eye: eyeRotatedBoth,
                })
            }));
        }

    } else if (state.view.zooming || (state.settings.view.pinchToZoom && e.ctrlKey)) {
        const forward = vec3.sub(vec3.create(), target, eye);
        vec3.normalize(forward, forward);

        const heightBasedMultiplier = vec3.dist(target, eye) / 200;

        const delta = state.settings.view.zoomSensitivity * e.deltaY * heightBasedMultiplier;
        const eyeZoomed = vec3.scaleAndAdd(
            vec3.create(),
            eye,
            forward,
            delta
        );

        if (eyeZoomed[2] > 10) {
            setState(oldState => ({
                view: Object.assign(oldState.view, {
                    eye: eyeZoomed
                })
            }));
        }
    } else {
        const forward = vec3.sub(vec3.create(), target, eye);
        forward[2] = 0;
        vec3.normalize(forward, forward);
        const sideways = vec3.rotateZ(vec3.create(), forward, vec3.create(), Math.PI / 2.0);

        const heightBasedMultiplier = vec3.dist(target, eye) / 200;

        const delta = vec3.scaleAndAdd(vec3.create(),
            vec3.scale(
                vec3.create(),
                forward,
                e.deltaY * state.settings.view.panYSensitivity * heightBasedMultiplier
            ),
            sideways,
            e.deltaX * state.settings.view.panXSensitivity * heightBasedMultiplier
        );

        setState(oldState => ({
            view: Object.assign(oldState.view, {
                eye: vec3.add(vec3.create(), oldState.view.eye, delta),
                target: vec3.add(vec3.create(), oldState.view.target, delta),
            })
        }));
    }
}

export function getMatrices(state, width, height) {
    const { eye, target, verticalFov } = state.view;

    return {
        viewMatrix: mat4.lookAt(mat4.create(), eye, target, [0, 0, 1]),
        perspectiveMatrix: mat4.perspective(mat4.create(), verticalFov, width / height, 0.1, 50000)
    };
}