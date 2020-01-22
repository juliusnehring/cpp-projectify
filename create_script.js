class Library {
    constructor(name, url, description, projectPage, dependencies) {
        this.name = name;
        this.url = url;
        this.dependencies = dependencies;
        this.checkbox == null;
        this.projectPage = projectPage;
        this.description = description;
    }
}

var getJSON = function (url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function () {
        var status = xhr.status;
        if (status === 200) {
            callback(null, xhr.response);
        } else {
            callback(status, xhr.response);
        }
    };
    xhr.send();
};

function load_libraries(callback) {
    var url = "https://raw.githubusercontent.com/lightwalk/cpp-projectify/master/libraries.json";
    output = [];
    getJSON(url, function (err, libs) {
        if (err !== null) {
            console.log("something went wrong " + err);
        }
        else {
            for (const lib of libs.libraries) {
                output.push(new Library(
                    lib.name,
                    lib.git_url,
                    lib.description,
                    lib.project_url,
                    lib.dependencies
                ));
            }
            callback(output);
        }
    });
}

var libraries = [];

function get_lib(name) {
    for (const lib of libraries) {
        if (lib.name == name) {
            return lib;
        }
    }
    return null;
}

function disable_lib(name) {
    for (lib of libraries) {
        if (lib.dependencies.includes(name)) {
            var othercb = lib.checkbox;
            othercb.checked = false;
            disable_lib(lib.name);
        }
    }
}

function enable_lib(name) {
    lib = get_lib(name);
    for (const depend of lib.dependencies) {
        var othercb = get_lib(depend).checkbox;
        othercb.checked = true;
        enable_lib(depend);
    }
}

function onCheckboxClicked(cb) {
    var name = cb.value;
    if (cb.checked) {
        enable_lib(name);
    }
    else {
        disable_lib(name);
    }
}

function init() {
    load_libraries(
        function (libs) {
            libraries = libs;
            var container = document.getElementById("libraries_div");
            var table = document.createElement("table");

            var header = document.createElement("tr");
            header.appendChild(document.createElement("th")); // checkbox
            var header_name = document.createElement("th");
            header_name.appendChild(document.createTextNode("Name"));
            header.appendChild(header_name);
            var header_description = document.createElement("th");
            header_description.appendChild(document.createTextNode("Description"));
            header.appendChild(header_description);
            var header_project_url = document.createElement("th");
            header_project_url.appendChild(document.createTextNode("Project Page"));
            header.appendChild(header_project_url);
            table.appendChild(header);

            for (lib of libraries) {
                var row = document.createElement("tr");
                var checkbox_container = document.createElement("td");
                var name_container = document.createElement("td");
                var description_container = document.createElement("td");
                var project_page_container = document.createElement("td");

                var checkbox = document.createElement("input");
                var cbId = lib.name + "Checkbox";
                checkbox.id = cbId;
                checkbox.type = "checkbox";
                checkbox.textContent = lib.name;
                lib.checkbox = checkbox;
                checkbox.value = lib.name;
                checkbox.onclick = function () { onCheckboxClicked(this); };

                var label = document.createElement("label");
                label.setAttribute("for", cbId);
                label.innerText = lib.name;

                var description = document.createTextNode(lib.description);

                var project_page = document.createElement("a");
                var link_text = document.createTextNode(lib.projectPage.replace(/(^\w+:|^)\/\//, ''));
                project_page.appendChild(link_text)
                project_page.title = lib.projectPage;
                project_page.title = lib.projectPage;
                project_page.href = lib.projectPage;
                project_page.setAttribute("target", "_blank");

                checkbox_container.appendChild(checkbox);
                name_container.appendChild(label);
                description_container.appendChild(description);
                project_page_container.appendChild(project_page);

                row.appendChild(checkbox_container);
                row.appendChild(name_container);
                row.appendChild(description_container);
                row.appendChild(project_page_container);
                table.appendChild(row);
            }
            container.appendChild(table);
        }
    );
}

function setupCheckboxes() {
    container = document.getElementById("libraries_div");
    for (lib of libraries) {
        var checkbox = document.createElement("input");
        var cbId = lib.name + "Checkbox";
        checkbox.id = cbId;
        checkbox.type = "checkbox";
        checkbox.textContent = lib.name;
        checkbox.value = lib.name;
        checkbox.onclick = function () { onCheckboxClicked(this); };
        var label = document.createElement("label");
        label.setAttribute("for", cbId);
        label.innerText = lib.name;
        container.appendChild(checkbox);
        container.appendChild(label);
        container.appendChild(document.createElement("br"));
        lib.checkbox = checkbox;
    }
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function onGenerateCommandClicked() {
    document.getElementById("generated_command").value = generate_command();
}

function depends_on(lib, dependee) {
    return lib.dependencies.includes(dependee.name);
}

function getEnabledLibraries() {
    var libs = new Array();
    for (lib of libraries) {
        if (lib.checkbox && lib.checkbox.checked) {
            libs.push(lib);
        }
    }
    // insertion sort
    for (var i = 1; i < libs.length; i++) {
        for (var j = i; j < libs.length; j++) {
            if (depends_on(libs[i], libs[j])) {
                var tmp = libs[i];
                libs[i] = libs[j];
                libs[j] = tmp;
            }
        }
    }
    return libs;
}

const copyToClipboard = str => {
    const el = document.createElement('textarea');  // Create a <textarea> element
    el.value = str;                                 // Set its value to the string that you want copied
    el.setAttribute('readonly', '');                // Make it readonly to be tamper-proof
    el.style.position = 'absolute';
    el.style.left = '-9999px';                      // Move outside the screen to make it invisible
    document.body.appendChild(el);                  // Append the <textarea> element to the HTML document
    const selected =
        document.getSelection().rangeCount > 0        // Check if there is any content selected previously
            ? document.getSelection().getRangeAt(0)     // Store selection if found
            : false;                                    // Mark as false to know no selection existed before
    el.select();                                    // Select the <textarea> content
    document.execCommand('copy');                   // Copy - only works as a result of a user action (e.g. click events)
    document.body.removeChild(el);                  // Remove the <textarea> element
    if (selected) {                                 // If a selection existed before copying
        document.getSelection().removeAllRanges();    // Unselect everything on the HTML document
        document.getSelection().addRange(selected);   // Restore the original selection
    }
};

function checkValidGitUrl(url) {
    // extremely simple test for now:
    return (url.startsWith("git://") || url.startsWith("git@") || url.startsWith("https://")) && url.endsWith(".git");
}

function checkValidName(name) {
    if (!name) {
        window.alert("Project name is empty!");
        return false;
    }

    if (name.split(" ").length != 1) {
        window.alert("Project name must be a single word!");
        return false;
    }

    return true;
}

function onGenerateButtonClick() {
    if (checkValidName(document.getElementById("project_name_text_field").value)) {
        var script = generate_script();
        var output = document.getElementById("output_textarea");
        output.value = script;
        copyToClipboard(script);
    }
}

function decodeHtml(html) {
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

function onCopyToClipboardClick() {
    var output = document.getElementById("output_textarea");
    copyToClipboard(decodeHtml(output.value));
}

function contains(libraries, name) {
    for (const lib of libraries) {
        if (lib.name == name)
            return true;
    }
    return false;
}

function nameFromGitUrl(url) {
    if (!checkValidGitUrl(url)) {
        window.alert("Not a valid git url!");
        return null;
    }
    var name = "";
    var n = url.lastIndexOf("/");
    if (n >= 0) {
        var name = url.substring(n + 1, url.length - 4); // remove .git
    }
    return name;
}

function onRepositoryChanged() {
    var textfield = document.getElementById("git_repository_text_field");
    var url = textfield.value;
    console.log(url);
    if (url) {
        var projectName = nameFromGitUrl(url);
        console.log(projectName);
        if (projectName) {
            var projectNameText = document.getElementById("project_name_text_field");
            projectNameText.value = projectName;
        }
    }
}

/// See https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

function generate_script() {
    var script = "";

    var projectName = document.getElementById("project_name_text_field").value.replace(/\s/g, '');
    var projectUrl = document.getElementById("git_repository_text_field").value;
    var enabledLibs = getEnabledLibraries();

    var filename = uuidv4() + ".py";

    script += "wget -O " + filename + " https://raw.githubusercontent.com/lightwalk/cpp-projectify/master/generate.py && python3 " + filename + " -n " + projectName;

    if (projectUrl) {
        script += " -u " + projectUrl;
    }

    for (const lib of enabledLibs) {
        script += " " + lib.name;
    }

    script += " && rm -f " + filename;

    return script;
}

window.onload = function () {
    this.init();
}
