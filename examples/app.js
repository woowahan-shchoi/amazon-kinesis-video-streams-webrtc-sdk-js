function createVideoSection(displayName, viewClass) {
    const element = `<div class="col">
                    <h5>${displayName}</h5>
                    <div class="video-container"><video class="${viewClass}" autoplay playsinline controls muted /></div>
                </div>`;

    const wrapperElement = document.createElement('div');
    wrapperElement.innerHTML = element;

    return wrapperElement.firstChild;
}

function configureLogging() {
    function log(level, messages) {
        const text = messages
            .map(message => {
                if (typeof message === 'object') {
                    return JSON.stringify(message, null, 2);
                } else {
                    return message;
                }
            })
            .join(' ');
        $('#logs').append($(`<div class="${level.toLowerCase()}">`).text(`[${new Date().toISOString()}] [${level}] ${text}\n`));
    }

    console._error = console.error;
    console.error = function(...rest) {
        log('ERROR', Array.prototype.slice.call(rest));
        console._error.apply(this, rest);
    };

    console._warn = console.warn;
    console.warn = function(...rest) {
        log('WARN', Array.prototype.slice.call(rest));
        console._warn.apply(this, rest);
    };

    console._log = console.log;
    console.log = function(...rest) {
        log('INFO', Array.prototype.slice.call(rest));
        console._log.apply(this, rest);
    };
}

function getRandomClientId() {
    return Math.random()
        .toString(36)
        .substring(2)
        .toUpperCase();
}

function getFormValues() {
    return {
        region: $('#region').val(),
        channelName: $('#channelName').val(),
        clientId: $('#clientId').val() || getRandomClientId(),
        sendVideo: $('#sendVideo').is(':checked'),
        sendAudio: $('#sendAudio').is(':checked'),
        openDataChannel: $('#openDataChannel').is(':checked'),
        widescreen: $('#widescreen').is(':checked'),
        fullscreen: $('#fullscreen').is(':checked'),
        useTrickleICE: $('#useTrickleICE').is(':checked'),
        natTraversalDisabled: $('#natTraversalDisabled').is(':checked'),
        forceTURN: $('#forceTURN').is(':checked'),
        accessKeyId: $('#accessKeyId').val(),
        endpoint: $('#endpoint').val() || null,
        secretAccessKey: $('#secretAccessKey').val(),
        sessionToken: $('#sessionToken').val() || null,
        numberOfMasterCameras: $('#master-camera').val() || 1,
        numberOfViewerCameras: 1,
    };
}

function toggleDataChannelElements() {
    if (getFormValues().openDataChannel) {
        $('.datachannel').removeClass('d-none');
    } else {
        $('.datachannel').addClass('d-none');
    }
}

function onStatsReport(report) {
    // TODO: Publish stats
}

window.addEventListener('error', function(event) {
    console.error(event.message);
    event.preventDefault();
});

window.addEventListener('unhandledrejection', function(event) {
    console.error(event.reason.toString());
    event.preventDefault();
});

configureLogging();

$('#master-button').click(async () => {
    $('#form').addClass('d-none');
    $('#master').removeClass('d-none');

    const localView = [];
    const remoteView = [];

    for (let i = 0, len = getFormValues().numberOfMasterCameras; i < len; i++) {
        const videoSection = createVideoSection('Master-' + i, 'local-view');
        const parent = document.querySelector('#master-local');
        parent.insertAdjacentElement("beforeend", videoSection);
        localView.push(videoSection.querySelector('VIDEO'));
    }

    for (let i = 0, len = getFormValues().numberOfViewerCameras; i < len; i++) {
        const videoSection = createVideoSection('FromViewer-' + i, 'remote-view');
        const parent = document.querySelector('#master-remote');
        parent.insertAdjacentElement("beforeend", videoSection);
        remoteView.push(videoSection.querySelector('VIDEO'));
    }

    // const localView = $('#master .local-view')[0];
    // const remoteView = $('#master .remote-view')[0];

    const localMessage = $('#master .local-message')[0];
    const remoteMessage = $('#master .remote-message')[0];
    const formValues = getFormValues();

    $(remoteMessage).empty();
    localMessage.value = '';
    toggleDataChannelElements();

    startMaster(localView, remoteView, formValues, onStatsReport, event => {
        remoteMessage.append(`${event.data}\n`);
    });
});

$('#stop-master-button').click(async () => {
    stopMaster();

    $('#form').removeClass('d-none');
    $('#master').addClass('d-none');
});

$('#viewer-button').click(async () => {
    $('#form').addClass('d-none');
    $('#viewer').removeClass('d-none');

    const localView = [];
    const remoteView = [];

    for (let i = 0, len = getFormValues().numberOfViewerCameras; i < len; i++) {
        const videoSection = createVideoSection('ReturnChannel-' + i, 'local-view');
        const parent = document.querySelector('#viewer-local');
        parent.insertAdjacentElement("beforeend", videoSection);
        localView.push(videoSection.querySelector('VIDEO'));
    }

    for (let i = 0, len = getFormValues().numberOfMasterCameras; i < len; i++) {
        const videoSection = createVideoSection('FromMaster-' + i, 'remote-view');
        const parent = document.querySelector('#viewer-remote');
        parent.insertAdjacentElement("beforeend", videoSection);
        remoteView.push(videoSection.querySelector('VIDEO'));
    }

    // const localView = $('#viewer .local-view')[0];
    // const remoteView = $('#viewer .remote-view')[0];
    const localMessage = $('#viewer .local-message')[0];
    const remoteMessage = $('#viewer .remote-message')[0];
    const formValues = getFormValues();

    $(remoteMessage).empty();
    localMessage.value = '';
    toggleDataChannelElements();

    startViewer(localView, remoteView, formValues, onStatsReport, event => {
        remoteMessage.append(`${event.data}\n`);
    });
});

$('#stop-viewer-button').click(async () => {
    stopViewer();

    $('#form').removeClass('d-none');
    $('#viewer').addClass('d-none');
});

$('#create-channel-button').click(async () => {
    const formValues = getFormValues();

    createSignalingChannel(formValues);
});

$('#master .send-message').click(async () => {
    const masterLocalMessage = $('#master .local-message')[0];
    sendMasterMessage(masterLocalMessage.value);
});

$('#viewer .send-message').click(async () => {
    const viewerLocalMessage = $('#viewer .local-message')[0];
    sendViewerMessage(viewerLocalMessage.value);
});

// Read/Write all of the fields to/from localStorage so that fields are not lost on refresh.
const urlParams = new URLSearchParams(window.location.search);
const fields = [
    { field: 'channelName', type: 'text' },
    { field: 'clientId', type: 'text' },
    { field: 'region', type: 'text' },
    { field: 'accessKeyId', type: 'text' },
    { field: 'secretAccessKey', type: 'text' },
    { field: 'sessionToken', type: 'text' },
    { field: 'endpoint', type: 'text' },
    { field: 'sendVideo', type: 'checkbox' },
    { field: 'sendAudio', type: 'checkbox' },
    { field: 'widescreen', type: 'radio', name: 'resolution' },
    { field: 'fullscreen', type: 'radio', name: 'resolution' },
    { field: 'openDataChannel', type: 'checkbox' },
    { field: 'useTrickleICE', type: 'checkbox' },
    { field: 'natTraversalEnabled', type: 'radio', name: 'natTraversal' },
    { field: 'forceTURN', type: 'radio', name: 'natTraversal' },
    { field: 'natTraversalDisabled', type: 'radio', name: 'natTraversal' },
];
fields.forEach(({ field, type, name }) => {
    const id = '#' + field;

    // Read field from localStorage
    try {
        const localStorageValue = localStorage.getItem(field);
        if (localStorageValue) {
            if (type === 'checkbox' || type === 'radio') {
                $(id).prop('checked', localStorageValue === 'true');
            } else {
                $(id).val(localStorageValue);
            }
            $(id).trigger('change');
        }
    } catch (e) {
        /* Don't use localStorage */
    }

    // Read field from query string
    if (urlParams.has(field)) {
        paramValue = urlParams.get(field);
        if (type === 'checkbox' || type === 'radio') {
            $(id).prop('checked', paramValue === 'true');
        } else {
            $(id).val(paramValue);
        }
    }

    // Write field to localstorage on change event
    $(id).change(function() {
        try {
            if (type === 'checkbox') {
                localStorage.setItem(field, $(id).is(':checked'));
            } else if (type === 'radio') {
                fields
                    .filter(fieldItem => fieldItem.name === name)
                    .forEach(fieldItem => {
                        localStorage.setItem(fieldItem.field, fieldItem.field === field);
                    });
            } else {
                localStorage.setItem(field, $(id).val());
            }
        } catch (e) {
            /* Don't use localStorage */
        }
    });
});

// The page is all setup. Hide the loading spinner and show the page content.
$('.loader').addClass('d-none');
$('#main').removeClass('d-none');
console.log('Page loaded');
