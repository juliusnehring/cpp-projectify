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
    var url = "libraries.json";
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
            header_project_url.appendChild(document.createTextNode("Repository"));
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
                var link_text = document.createTextNode(new URL(lib.projectPage).hostname);
                project_page.appendChild(link_text)
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
        output.select();
        output.setSelectionRange(0, 99999);
        document.execCommand("copy");
    }
}

function decodeHtml(html) {
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
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

function generate_script() {
    const projectName = document.getElementById("project_name_text_field").value.replace(/\s/g, '');
    const currentUrl = document.location.href;

    let script = "curl " + currentUrl + "generate.py | python3 - -n " + projectName + " -o " + currentUrl;

    const projectUrl = document.getElementById("git_repository_text_field").value;
    if (projectUrl) {
        script += " -u " + projectUrl;
    }

    const gccClangFlags = document.getElementById("flags_linux").value;
    if (gccClangFlags)
    {
        script += " -l \"" + gccClangFlags + "\"";
    }

    const msvcFlags = document.getElementById("flags_msvc").value;
    if (msvcFlags)
    {
        script += " -m \"" + msvcFlags + "\"";
    }

    const enabledLibs = getEnabledLibraries();
    for (const lib of enabledLibs) {
        script += " " + lib.name;
    }

    return script;
}

window.onload = function () {
    this.init();
}
