const MODAL_PORTAL_ROOT_ID = 'vrcx-modal-portal-root';
const APP_PORTAL_ROOT_ID = 'x-dialog-portal';

const BASE_Z_INDEX = 10000;
const Z_STEP = 10;

let nextLayerIndex = 0;

function ensureModalPortalRoot(targetDocument) {
    if (!targetDocument) {
        return null;
    }

    let root = targetDocument.getElementById(APP_PORTAL_ROOT_ID);
    if (root) {
        root.style.position ||= 'relative';
        root.style.isolation ||= 'isolate';
        root.style.zIndex ||= String(BASE_Z_INDEX);
        return root;
    }

    root = targetDocument.getElementById(MODAL_PORTAL_ROOT_ID);
    if (root) {
        root.style.position ||= 'relative';
        root.style.isolation ||= 'isolate';
        root.style.zIndex ||= String(BASE_Z_INDEX);
        return root;
    }

    root = targetDocument.createElement('div');
    root.id = MODAL_PORTAL_ROOT_ID;
    root.style.position = 'relative';
    root.style.isolation = 'isolate';
    root.style.zIndex = String(BASE_Z_INDEX);
    targetDocument.body.appendChild(root);
    return root;
}

export function acquireModalPortalLayer(targetDocument = globalThis.document) {
    const root = ensureModalPortalRoot(targetDocument);
    if (!root) {
        return {
            element: undefined,
            release() {}
        };
    }

    const element = targetDocument.createElement('div');
    element.dataset.vrcxPortalLayer = 'modal';
    element.style.position = 'relative';
    element.style.isolation = 'isolate';
    nextLayerIndex += 1;
    element.style.zIndex = String(BASE_Z_INDEX + nextLayerIndex * Z_STEP);
    root.appendChild(element);

    const release = () => {
        element.remove();
    };

    return {
        element,
        release
    };
}
