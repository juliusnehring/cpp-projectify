class Library {
    constructor(name, git_url_ssh, git_url_https, description, projectPage, dependencies, addons) {
        this.name = name;
        this.git_url_ssh = git_url_ssh;
        this.git_url_https = git_url_https;
        this.dependencies = dependencies;
        this.selectedCheckbox = null;
        this.useSSHCheckbox = null;
        this.projectPage = projectPage;
        this.description = description;
        this.addons = addons;
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
    var output = [];
    getJSON(url, function (err, libs) {
        if (err !== null) {
            console.log("something went wrong " + err);
        }
        else {
            for (const lib of libs.libraries) {
                output.push(new Library(
                    lib.name,
                    lib.git_url_ssh,
                    lib.git_url_https,
                    lib.description,
                    lib.project_url,
                    lib.dependencies,
                    lib.addons
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
            lib.selectedCheckbox.checked = false;
            disable_lib(lib.name);
        }
    }
}

function enable_lib(name) {
    lib = get_lib(name);
    for (const depend of lib.dependencies) {
        get_lib(depend).selectedCheckbox.checked = true;
        enable_lib(depend);
    }
}

function onSelectedCheckboxClicked(cb) {
    var name = cb.value;
    if (cb.checked) {
        enable_lib(name);
    }
    else {
        disable_lib(name);
    }
}


function onAllSSHCheckboxClicked(cb) {
    for (lib of libraries) {
        lib.useSSHCheckbox.checked = cb.checked;
    }
}


function onSelectAllCheckboxClicked(cb) {
    for (lib of libraries) {
        lib.selectedCheckbox.checked = cb.checked;
    }
}

function init() {
    load_libraries(
        function (libs) {
            libraries = libs;
            var container = document.getElementById("libraries_div");
            var table = document.createElement("table");

            var header = document.createElement("tr");

            var header_selectCheckbox = document.createElement("th");
            var selectAllCheckbox = document.createElement("input");
            selectAllCheckbox.id = "selectAllCheckbox";
            selectAllCheckbox.type = "checkbox";
            selectAllCheckbox.onclick = function () { onSelectAllCheckboxClicked(this); };
            header_selectCheckbox.appendChild(selectAllCheckbox);
            header.appendChild(header_selectCheckbox); // checkbox

            var header_name = document.createElement("th");
            header_name.appendChild(document.createTextNode("Name"));
            header.appendChild(header_name);

            var header_description = document.createElement("th");
            header_description.appendChild(document.createTextNode("Description"));
            header.appendChild(header_description);

            var header_project_url = document.createElement("th");
            header_project_url.appendChild(document.createTextNode("Repository"));
            header.appendChild(header_project_url);

            var header_ssh = document.createElement("th");
            header_ssh.setAttribute("title", "The default method for cloning submodules is https. Check to use your ssh key instead.")
            header_ssh.appendChild(document.createTextNode("ssh"));
            var selectAllSSHCheckbox = document.createElement("input");
            selectAllSSHCheckbox.type = "checkbox";
            selectAllSSHCheckbox.id = "selectAllSSHCheckbox";
            selectAllSSHCheckbox.onclick = function () { onAllSSHCheckboxClicked(this); };
            header_ssh.appendChild(selectAllSSHCheckbox);

            header.appendChild(header_ssh);

            table.appendChild(header);

            for (lib of libraries) {
                var row = document.createElement("tr");
                var checkbox_container = document.createElement("td");
                var name_container = document.createElement("td");
                var description_container = document.createElement("td");
                var project_page_container = document.createElement("td");
                var useSSHContainer = document.createElement("td");
                useSSHContainer.setAttribute("title", "The default method for cloning submodules is https. Check to use your ssh key instead.")

                var selectedCheckbox = document.createElement("input");
                var cbId = lib.name + "Checkbox";
                selectedCheckbox.id = cbId;
                selectedCheckbox.type = "checkbox";
                selectedCheckbox.textContent = lib.name;
                selectedCheckbox.value = lib.name;
                selectedCheckbox.onclick = function () { onSelectedCheckboxClicked(this); };
                lib.selectedCheckbox = selectedCheckbox;

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

                checkbox_container.appendChild(selectedCheckbox);
                name_container.appendChild(label);
                description_container.appendChild(description);
                project_page_container.appendChild(project_page);

                var useSSHCheckbox = document.createElement("input");
                useSSHCheckbox.id = lib.name + "useSSHCheckbox";
                useSSHCheckbox.type = "checkbox";
                lib.useSSHCheckbox = useSSHCheckbox;
                useSSHContainer.appendChild(useSSHCheckbox);

                row.appendChild(checkbox_container);
                row.appendChild(name_container);
                row.appendChild(description_container);
                row.appendChild(project_page_container);
                row.appendChild(useSSHContainer);
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

function has_addon(lib, addon) {
    return lib.addons.includes(addon.name);
}

function getEnabledLibraries() {
    var libs = new Array();
    for (lib of libraries) {
        if (lib.selectedCheckbox && lib.selectedCheckbox.checked) {
            libs.push(lib);
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
    const currentUrl = document.location.href.replace("index.html", "");

    let script = "curl " + currentUrl + "generate.py | python3 - -n " + projectName + " -o " + currentUrl;

    const projectUrl = document.getElementById("git_repository_text_field").value;
    if (projectUrl) {
        script += " -u " + projectUrl;
    }

    const gccClangFlags = document.getElementById("flags_linux").value;
    if (gccClangFlags) {
        script += " -l \"" + gccClangFlags + "\"";
    }

    const msvcFlags = document.getElementById("flags_msvc").value;
    if (msvcFlags) {
        script += " -m \"" + msvcFlags + "\"";
    }

    const enabledLibs = getEnabledLibraries();
    for (const lib of enabledLibs) {
        if (lib.useSSHCheckbox && lib.useSSHCheckbox.checked) {
            script += " -libssh " + lib.name;
        }
        else {
            script += " -lib " + lib.name;
        }
    }

    return script;
}

window.onload = function () {
    this.init();
}
