export default class Toolbox {
    private canvas: HTMLCanvasElement;
    private uiHints: HTMLCanvasElement;
    private toolsDiv: HTMLElement;
    private tools: Array<any>;
    private toolButtons: Array<any>;
    private currentTool;

    constructor(private toolList: Array<any>) {
        if (!toolList.length) {
            throw new Error("Need at least one tool!");
        }
    }

    install(canvas, uiHints, toolsDiv) {
        this.canvas = canvas;
        this.uiHints = uiHints;
        this.toolsDiv = toolsDiv;

        this.tools = []; this.toolButtons = [];
        for (let toolClass of this.toolList) {
            let tool = new toolClass(this.canvas, this.uiHints),
                buttonEl = this.createToolButton(tool);

            this.tools.push(tool);
            this.toolButtons.push(buttonEl);
            this.toolsDiv.appendChild(buttonEl);
        }
        this.currentTool = this.tools[0];
        this.toolButtons[0].classList.add("active");
    }

    createToolButton(tool) {
        let toolClass = tool.constructor,
            buttonDomEl = document.createElement("button"),
            toolIconEl = document.createElement("img"),
            self = this;

        toolIconEl.src = "img/" + toolClass.img;
        toolIconEl.alt = "";

        buttonDomEl.accessKey = toolClass.accessKey;
        buttonDomEl.appendChild(toolIconEl);
        buttonDomEl.appendChild(document.createTextNode(" " + toolClass.title));
        buttonDomEl.addEventListener("click", () => {
            let uiHintsCtx = this.uiHints.getContext("2d");
            uiHintsCtx.clearRect(0, 0, this.uiHints.width, this.uiHints.height);
            self.currentTool = tool;
            for (let button of self.toolButtons) {
                button.classList.remove("active");
            }
            buttonDomEl.classList.add("active");
        }, false);

        return buttonDomEl;
    }
}
