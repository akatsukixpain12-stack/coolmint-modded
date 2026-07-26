var inputDepth: HTMLInputElement;
var inputThreads: HTMLInputElement;
var inputShowHints: HTMLInputElement;
var inputMoveAnalysis: HTMLInputElement;
var inputDepthBar: HTMLInputElement;
var inputEvalBar: HTMLInputElement;
var inputAutoMove: HTMLInputElement;
var inputUseNNUE: HTMLInputElement;
var inputUciElo: HTMLInputElement;

const DefaultExtensionOptions: ExtensionOptions = {
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


function RestoreOptions()
{
    chrome.storage.sync.get(DefaultExtensionOptions, function (opts: any)
    {
        let options = opts as ExtensionOptions;
        inputDepth.value = options.depth.toString();
        inputThreads.value = options.threads.toString();
        inputShowHints.checked = options.show_hints;
        inputMoveAnalysis.checked = options.move_analysis;
        inputDepthBar.checked = options.depth_bar;
        inputEvalBar.checked = options.evaluation_bar;
        inputUseNNUE.checked = options.use_nnue;
        inputAutoMove.checked = options.auto_move;
        inputUciElo.value = options.uci_elo.toString();

        let event = new CustomEvent("input");
        (event as any).disableUpdate = true;
        inputDepth.dispatchEvent(event);
        inputThreads.dispatchEvent(event);
        inputUciElo.dispatchEvent(event);
    });
}

function OnOptionsChange()
{
    let options: ExtensionOptions = {
        depth: parseInt(inputDepth.value),
        threads: parseInt(inputThreads.value),
        show_hints: inputShowHints.checked,
        move_analysis: inputMoveAnalysis.checked,
        depth_bar: inputDepthBar.checked,
        evaluation_bar: inputEvalBar.checked,
        use_nnue: inputUseNNUE.checked,
        auto_move: inputAutoMove.checked,
        uci_elo: parseInt(inputUciElo.value),
        uci_limit_strength: false,
        opponent_elo: 1500,
        anti_ban_enabled: true,
        anti_ban_min_delay: 500,
        anti_ban_max_delay: 2000,
        anti_ban_randomize: true,
    }

    chrome.storage.sync.set(options);

    chrome.tabs.query({}, function (tabs: any[])
    {
        tabs.forEach(function (tab: any)
        {
            chrome.tabs.sendMessage(tab.id as number, { type: "UpdateOptions", data: options });
        })
    });
}

function InitOptions()
{
    inputDepth = document.getElementById("option-depth") as HTMLInputElement;
    inputThreads = document.getElementById("option-threads") as HTMLInputElement;
    inputShowHints = document.getElementById("option-show-hints") as HTMLInputElement;
    inputMoveAnalysis = document.getElementById("option-move-analysis") as HTMLInputElement;
    inputDepthBar = document.getElementById("option-depth-bar") as HTMLInputElement;
    inputEvalBar = document.getElementById("option-evaluation-bar") as HTMLInputElement;
    inputUseNNUE = document.getElementById("option-use-nnue") as HTMLInputElement;
    inputAutoMove = document.getElementById("option-auto-move") as HTMLInputElement;
    inputUciElo = document.getElementById("option-uci-elo") as HTMLInputElement;

    const sliderProps = {
        fill: "#2CA137",
        background: "rgba(255, 255, 255, 0.214)",
    };


    document.querySelectorAll(".options-slider").forEach(function (slider)
    {
        const title = slider.querySelector(".title");
        const input = slider.querySelector("input");
        if (title == null || input == null) return;

        input.min = slider.getAttribute("data-min") as string;
        input.max = slider.getAttribute("data-max") as string;

        input.addEventListener("input", (event: Event) =>
        {
            const value = parseInt(input.value);
            const minValue = parseInt(input.min);
            const maxValue = parseInt(input.max);
            const percent = (value - minValue) / (maxValue - minValue) * 100;
            const bg = `linear-gradient(90deg, ${sliderProps.fill} ${percent}%, ${sliderProps.background} ${percent + 0.1}%)`;

            input.style.background = bg;
            title.setAttribute("data-value", input.value);

            if (!(event as any).disableUpdate)
                OnOptionsChange();
        });
    })

    document.querySelectorAll(".options-checkbox").forEach(function (checkbox)
    {
        checkbox.addEventListener("change", function ()
        {
            OnOptionsChange();
        });
    });

    RestoreOptions();
}

document.addEventListener('DOMContentLoaded', InitOptions);