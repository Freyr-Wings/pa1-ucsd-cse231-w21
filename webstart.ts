import {run} from './runner';


function webStart() {
  document.addEventListener("DOMContentLoaded", function() {
    var importObject = {
      imports: {
        print: (arg : any) => {
          console.log("Logging from WASM: ", arg);
          const elt = document.createElement("pre");
          document.getElementById("output").appendChild(elt);
          elt.innerText = arg;
          return arg;
        },

        abs: Math.abs,
        max: Math.max,
        min: Math.min,
        pow: Math.pow
      },
    };

    // const env = emptyEnv;
    // var repl = new BasicREPL(importObject);

    let initialized = false;

    function renderResult(result : any) : void {
      if(result === undefined) { console.log("skip"); return; }
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      elt.innerText = String(result);
    }

    function renderError(result : any) : void {
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      elt.setAttribute("style", "color: red");
      elt.innerText = String(result);
    }

    function setupRepl() {
      const replCodeElement = document.getElementById("next-code") as HTMLInputElement;
      replCodeElement.addEventListener("keypress", (e) => {
        if(e.key === "Enter") {
          // capture the old entry
          const output = document.createElement("div");

          const prompt = document.createElement("span");
          prompt.innerText = "»";

          const elt = document.createElement("input");
          elt.type = "text";
          elt.disabled = true;
          elt.className = "repl-code";

          output.appendChild(prompt);
          output.appendChild(elt);
          document.getElementById("output").appendChild(output);

          const source = replCodeElement.value;
          elt.value = source;

          // clear the entry
          replCodeElement.value = "";

          // print output
          run(source, importObject).then((r) => { 
            renderResult(r); 
            console.log ("run finished") 
          }).catch((e) => { 
            renderError(e); 
            console.log("run failed", e); 
          });
        }
      });
    }

    document.getElementById("run").addEventListener("click", function(e) {
      // clear last results
      document.getElementById("output").innerHTML = "";
      
      // repl = new BasicREPL(importObject);
      const source = document.getElementById("user-code") as HTMLTextAreaElement;
      setupRepl();
      run(source.value, {importObject}).then((r) => { 
        renderResult(r); 
        console.log ("run finished"); 
      }).catch((e) => { 
        renderError(e); 
        console.log("run failed", e) 
      });
    });
  });
}

webStart();
