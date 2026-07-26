const DefaultExtensionOptions2: ExtensionOptions = {
    depth: 15,
    threads: 2,
    show_hints: true,
    move_analysis: true,
    depth_bar: true,
    evaluation_bar: true,
    use_nnue: false,
    auto_move: false,
    uci_elo: 3200,
    uci_limit_strength: false,
    opponent_elo: 1500,
    anti_ban_enabled: true,
    anti_ban_min_delay: 500,
    anti_ban_max_delay: 2000,
    anti_ban_randomize: true,
}


function injectScript(file: string)
{
    let script = document.createElement("script");
    script.src = chrome.runtime.getURL(file);

    let doc = (document.head || document.documentElement);

    // doc.appendChild(script);
    doc.insertBefore(script, doc.firstElementChild);

    script.onload = function () { script.remove(); };
}

chrome.runtime.onMessage.addListener(
    function (request: any, sender: any, sendResponse: any)
    {
        // pass the event to injected script
        window.dispatchEvent(new CustomEvent("ChessMintUpdateOptions", { detail: request.data }));
    }
);

window.addEventListener("ChessMintGetOptions", function (evt)
{
    chrome.storage.sync.get(DefaultExtensionOptions2, function (opts: any)
    {
        let request = (evt as any).detail;
        let response = { requestId: request.id, data: opts };
        window.dispatchEvent(new CustomEvent("ChessMintSendOptions", { detail: response }));
    });
});

injectScript("js/chessmint.js");