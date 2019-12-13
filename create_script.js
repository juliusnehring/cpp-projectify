urlOf = new Map();
urlOf["glfw"] = "https://github.com/glfw/glfw.git";
urlOf["glow"] = "https://www.graphics.rwth-aachen.de:9000/Glow/glow.git";
urlOf["glow-extras"] = "https://www.graphics.rwth-aachen.de:9000/Glow/glow-extras.git";
urlOf["typed-geometry"] = "https://www.graphics.rwth-aachen.de:9000/ptrettner/typed-geometry.git";
urlOf["polymesh"] = "https://www.graphics.rwth-aachen.de:9000/ptrettner/polymesh.git";
urlOf["imgui-lean"] = "https://www.graphics.rwth-aachen.de:9000/ptrettner/imgui-lean.git";
urlOf["ctracer"] = "https://www.graphics.rwth-aachen.de:9000/ptrettner/ctracer.git";

dependsOn = new Map();
dependsOn["glow-extras"] = "glow";
dependsOn["glow"] = "typed-geometry";
 // todo: DIS NO WORK! needs list

dependsOn["glow"] = "glfw";

// todo: dependency orders are important!
// todo: extra stuff needs to be done if glow is included!
// # ==============================================================================
// # Set bin dir
// if(MSVC)
//     set(BIN_DIR ${CMAKE_SOURCE_DIR}/bin)
// elseif(CMAKE_BUILD_TYPE STREQUAL "")
//     set(BIN_DIR ${CMAKE_SOURCE_DIR}/bin/Default)
// else()
//     set(BIN_DIR ${CMAKE_SOURCE_DIR}/bin/${CMAKE_BUILD_TYPE})
// endif()
// set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${BIN_DIR})
// set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE ${BIN_DIR})
// set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELWITHDEBINFO ${BIN_DIR})
// set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG ${BIN_DIR})
// set(GLOW_BIN_DIR ${CMAKE_SOURCE_DIR}/bin)

// todo: maybe still glm?
``

function onCheckboxClicked(cb)
{
    // todo
    var parent = cb.parent;
    if(cb.checked)
    {
        // enable dependencies


    }
    else
    {
        // disable stuff that depends on this
        
    }
}

function setupCheckboxes()
{
    container = document.getElementById("libraries_div");

    Object.keys(urlOf).forEach(function(name) {
        var checkbox = document.createElement("input");
        cbId = name + "Checkbox";
        checkbox.id = cbId;
        checkbox.type = "checkbox";
        checkbox.textContent = name;
        checkbox.value = name;
        checkbox.onclick = function(){onCheckboxClicked(this);};
        var label = document.createElement("label");
        label.setAttribute("for", cbId);
        label.innerHTML = name;
        container.appendChild(checkbox);
        container.appendChild(label);
        container.appendChild(document.createElement("br"));
    });
}

function download(filename, text) 
{
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function onGenerateCommandClicked()
{
    document.getElementById("generated_command").innerHTML = generate_command();
}

function getEnabledLibraries()
{
    var libs = new Array();
    Object.keys(urlOf).forEach(function(name) {
        var cb = document.getElementById(name + "Checkbox");
        console.log(cb);
        if(cb.checked)
        {
            libs.push({name=name, url=urlOf[name]});
        }
    });
    // sort by dependency order
    libs.sort(function(a,b){
        if(a.name in )
    });

    return libs;
}

function checkValidNameAndFolder()
{
    var projectName = document.getElementById("project_name_text_field").value;
    var projectFolder = document.getElementById("folder_name_text_field").value;

    if(!projectName)
    {
        window.alert("Project name is empty!");
        return false;        
    }

    if(!projectFolder)
    {
        window.alert("Project folder is empty!");
        return false;        
    }

    if(projectName.split(" ").length != 1)
    {
        window.alert("Project name must be a single word!");
        return false;
    }
    if(projectFolder.split(" ").length != 1){
        window.alert("Project folder must be a single word!");
        return false;
    }

    return true;
}

function onGenerateButtonClick()
{
    if(checkValidNameAndFolder())
    {
        var script = generate_script();
        download("script.sh", script);
    }
}

function generate_script()
{
    var script = "";

    var projectName = document.getElementById("project_name_text_field").value;
    var projectFolder = document.getElementById("folder_name_text_field").value;
    var enabledLibs = getEnabledLibraries();

    script += "#!/bin/bash\n";
    script += "project_name=" + projectName + "\n";
    script += "project_folder_name=" + projectFolder+ "\n";
    script += "source_folder_name=src\n";
    script += "is_libary=false\n";
    script += "\n";
    script += "submodule_urls=(\n"
    Object.keys(enabledLibs).forEach(function(name) 
    {
        script += enabledLibs[name] + " \n";
    });
    script += ")\n";
    script += "submodule_names=(\n";
    Object.keys(enabledLibs).forEach(function(name) 
    {
        script += name + " \n";
    });
    script += ")\n";
    script += "\n";
    script += "# takes a path to where main should lie\n";
    script += "function make_main\n";
    script += "{\n";
    script += "    echo \"#include <iostream>\" > $1\n";
    script += "    echo >> $1\n";
    script += "    echo \"int main(int /* argc */, char * /* argv */ [])\" >> $1\n";
    script += "    echo \"{\" >> $1\n";
    script += "    echo \"    std::cout << \"Hello World\" << std::endl;\" >> $1\n";
    script += "    echo \"}\" >> $1\n";
    script += "}\n";
    script += "\n";
    script += "function make_cmakelists \n";
    script += "{\n";
    script += "    # header\n";
    script += "    echo cmake_minimum_required\\(VERSION 3.8\\) > $1\n";
    script += "    echo project\\($project_name\\) >> $1\n";
    script += "    echo >> $1\n";
    script += "    echo \# =============================================== >> $1\n";
    script += "    echo \# Global settings >> $1\n";
    script += "    echo >> $1\n";
    script += "    echo set\\(CMAKE_CXX_STANDARD 17\\) >> $1\n";
    script += "    echo set\\(CMAKE_CXX_STANDARD_REQUIRED ON\\) >> $1\n";
    script += "    echo >> $1\n";
    script += "\n";
    script += "    echo \# =============================================== >> $1\n";
    script += "    echo \# add submodules >> $1\n";
    script += "    for name in ${submodule_names[*]}; do\n";
    script += "        echo add_subdirectory\\(extern/$name\\) >> $1\n";
    script += "    done\n";
    script += "\n";
    script += "    echo >> $1\n";
    script += "    echo \# =============================================== >> $1\n";
    script += "    echo \# Configure executable >> $1\n";
    script += "\n";
    script += "    # do evil glob\n";
    script += "    echo file\\(GLOB_RECURSE SOURCES >> $1\n";
    script += "    echo \"    \" \"src/*.cc\" >> $1\n";
    script += "    echo \"    \" \"src/*.hh\" >> $1\n";
    script += "    echo \"    \" \"src/*.cpp\" >> $1\n";
    script += "    echo \"    \" \"src/*.h\" >> $1\n";
    script += "    echo \\) >> $1\n";
    script += "    echo >> $1\n";
    script += "    \n";
    script += "    echo \# group sources according to folder structure >> $1\n";
    script += "    echo source_group\\(TREE \\${CMAKE_CURRENT_SOURCE_DIR} FILES \\${SOURCES}\\) >> $1\n";
    script += "    echo >> $1\n";
    script += "    \n";
    script += "    echo \# =============================================== >> $1\n";
    script += "    echo >> $1 \# Make executable\n";
    script += "    echo add_executable\\(\\${PROJECT_NAME} \\${SOURCES}\\) >> $1\n";
    script += "    echo >> $1\n";
    script += "\n";
    script += "    echo \# =============================================== >> $1\n";
    script += "    echo >> $1 \# Set link libraries\n";
    script += "    echo target_link_libraries\\(\\${PROJECT_NAME} PUBLIC >> $1\n";
    script += "    for name in ${submodule_names[*]}; do\n";
    script += "        echo \"    \" $name >> $1\n";
    script += "    done\n";
    script += "    echo \\) >> $1\n";
    script += "    echo >> $1\n";
    script += "    echo target_include_directories\\(\\${PROJECT_NAME} PUBLIC \"src\"\\) >> $1\n";
    script += "    echo >> $1\n";
    script += "\n";
    script += "    echo \# =============================================== >> $1\n";
    script += "    echo \# Compile flags >> $1\n";
    script += "    echo if \\(MSVC\\) >> $1\n";
    script += "    echo \"    \" target_compile_options\\(\\${PROJECT_NAME} PUBLIC >> $1\n";
    script += "    echo \"        \" /MP >> $1\n";
    script += "    echo \"    \" \\) >> $1\n";
    script += "    echo else\\(\\) >> $1\n";
    script += "    echo \"    \" target_compile_options\\(\\${PROJECT_NAME} PUBLIC >> $1\n";
    script += "    echo \"        \" -Wall >> $1\n";
    script += "    echo \"        \" -Werror >> $1\n";
    script += "    echo \"        \" -march=native >> $1\n";
    script += "    echo \"    \" \\) >> $1\n";
    script += "    echo endif\\(\\) >> $1\n";
    script += "\n";
    script += "    # todo: add test folder and executable\n";
    script += "\n";
    script += "}\n";
    script += "\n";
    script += "mkdir \"$project_folder_name\"\n";
    script += "cd \"$project_folder_name\"\n";
    script += "\n";
    script += "make_cmakelists \"CMakeLists.txt\"\n";
    script += "touch \"readme.md\"\n";
    script += "mkdir \"extern\"\n";
    script += "mkdir \"src\"\n";
    script += "mkdir \"bin\"\n";
    script += "\n";
    script += "if $is_libary; then\n";
    script += "    mkdir \"src/$project_folder_name\"\n";
    script += "    mkdir \"test\"\n";
    script += "    make_main \"test/main.cc\"\n";
    script += "else\n";
    script += "    make_main \"src/main.cc\"\n";
    script += "fi\n";
    script += "\n";
    script += "git init\n";
    script += "\n";
    script += "cd \"extern\"\n";
    script += "for url in ${submodule_urls[*]}; do\n";
    script += "    git submodule add $url\n";
    script += "done\n";
    script += "cd ..\n";
    script += "\n";
    script += "git submodule update --init --recursive\n";
    script += "\n";
    script += "# move back up\n";
    script += "cd ..\n";
    return script;
}

window.onload = function()
{
    this.setupCheckboxes();
}
