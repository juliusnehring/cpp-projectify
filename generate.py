import argparse
import urllib.request
import json
import os.path
import subprocess
from pathlib import Path


class Library(object):
    def __init__(self, data):
        self.__dict__ = data


def load_libraries():
    with urllib.request.urlopen("https://raw.githubusercontent.com/lightwalk/cpp-projectify/master/libraries.json") as url:
        data = json.loads(url.read().decode())
        libraries = []
        for lib in data["libraries"]:
            libraries.append(Library(lib))
        return libraries

def create_main(filepath):
    with open(filepath, "w") as f:
        f.write('#include <iostream>\n\n')
        f.write('int main(int /* argc */, char * /* argv */ [])\n')
        f.write('{\n')
        f.write('    std::cout << "Hello World!" << std::endl;\n')
        f.write('}\n')

def create_cmakelists(filepath, project_name, enabled_libraries):
    with open(filepath, "w") as f:
        f.write('cmake_minimum_required(VERSION 3.8)\n')
        f.write('project(' + project_name + ')\n')
        f.write("\n")
        f.write(
            """# ===============================================
# Global settings
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set_property(GLOBAL PROPERTY USE_FOLDERS ON)

# ===============================================
# Bin dir
if(MSVC)
    set(BIN_DIR ${CMAKE_SOURCE_DIR}/bin)
elseif(CMAKE_BUILD_TYPE STREQUAL "")
    set(BIN_DIR ${CMAKE_SOURCE_DIR}/bin/Default)
else()
    set(BIN_DIR ${CMAKE_SOURCE_DIR}/bin ${CMAKE_BUILD_TYPE})
endif()
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${BIN_DIR})
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE ${BIN_DIR})
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELWITHDEBINFO ${BIN_DIR})
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG ${BIN_DIR})
""")

        if any(lib.name == "glow" for lib in enabled_libraries):
            f.write("set(GLOW_BIN_DIR ${CMAKE_SOURCE_DIR}/bin)\n")

        f.write("\n")
        f.write("# ===============================================\n")
        f.write("# add submodules\n")

        for lib in enabled_libraries:
            f.write('add_subdirectory(extern/' + lib.name + ')\n')

        f.write('\n')
        f.write('# ===============================================\n')
        f.write('# Configure executable\n')
        f.write('\n')
        f.write('# do evil glob\n')
        f.write('file(GLOB_RECURSE SOURCES\n')
        f.write('    "src/*.cc"\n')
        f.write('    "src/*.hh"\n')
        f.write('    "src/*.cpp"\n')
        f.write('    "src/*.h"\n')
        f.write(')\n')
        f.write('\n')

        f.write('# group sources according to folder structure\n')
        f.write(
            'source_group(TREE ${CMAKE_CURRENT_SOURCE_DIR} FILES ${SOURCES})\n')

        f.write("\n")
        f.write('# ===============================================\n')
        f.write('# Make executable\n')
        f.write('add_executable(${PROJECT_NAME} ${SOURCES})\n')

        if(any(lib.name == "glfw" for lib in enabled_libraries)):
            f.write("\n")
            f.write('# ===============================================\n')
            f.write('# Mute some GLWF warnigns\n')
            f.write('option(GLFW_BUILD_EXAMPLES "" OFF)\n')
            f.write('option(GLFW_BUILD_TESTS "" OFF)\n')
            f.write('option(GLFW_BUILD_DOCS "" OFF)\n')
            f.write('option(GLFW_INSTALL "" OFF)\n')

        f.write("\n")
        f.write('# ===============================================\n')
        f.write('# Set link libraries\n')
        f.write('target_link_libraries(${PROJECT_NAME} PUBLIC\n')
        for lib in enabled_libraries:
            f.write("    " + lib.name)
        f.write(')\n')

        f.write('target_include_directories(${PROJECT_NAME} PUBLIC "src")\n')

        f.write("\n")
        f.write('# ===============================================\n')
        f.write('# Compile flags\n')
        f.write('if (MSVC)\n')
        f.write('    target_compile_options(${PROJECT_NAME} PUBLIC\n')
        f.write('        /MP\n')
        f.write('    )\n')
        f.write('else()\n')
        f.write('    target_compile_options(${PROJECT_NAME} PUBLIC\n')
        f.write('        -Wall\n')
        f.write('        -Werror\n')
        f.write('        -march=native\n')
        f.write('    )\n')
        f.write('endif()\n')


def get_enabled_libs(args):
    all_libs = load_libraries()
    return list(filter(lambda lib: lib.name in args.libraries, all_libs))


def setup_project(args):
    project_name = args.name
    project_url = args.url
    enabled_libs = get_enabled_libs(args)

    if(os.path.isdir(project_name)):
        print("Directory " + project_name + " already exists! Aborting!")
        return

    if(project_url):
        subprocess.Popen(["git", "clone", project_url, project_name])
    else:
        print("No git repository given. Init new repository?")

        choice = input("[y/n]: ").lower()
        while(choice != "yes" and choice != "y" and choice != "no" and choice != "n"):
            choice = input("[y/n]: ").lower()

        if(choice == "no" or choice == "n"):
            print("Aborting!")
            return

        os.mkdir(project_name)
        subprocess.Popen(["git", "-C", project_name, "init"])

    create_cmakelists(os.path.join(
        project_name, "CMakeLists.txt"), project_name, enabled_libs)

    Path(os.path.join(project_name, "README.md")).touch()

    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/lightwalk/cpp-projectify/master/data/.clang-format", os.path.join(project_name, ".clang-format"))

    os.mkdir(os.path.join(project_name, "extern"))
    os.mkdir(os.path.join(project_name, "src"))
    os.mkdir(os.path.join(project_name, "bin"))

    create_main(os.path.join(project_name, 'src','main.cc'))

    for lib in enabled_libs:
        subprocess.Popen(["git", "-C", os.path.join(project_name,
                                                    "extern"), "submodule", "add", lib.git_url, lib.name])

    subprocess.Popen(["git", "-C", project_name, "submodule",
                      "update", "--init", "--recursive"])

    print("DONE!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Create project with dependencies")
    parser.add_argument("--name", "-n", type=str, required=True)
    parser.add_argument("--url", "-u", type=str)
    parser.add_argument("libraries", nargs='*', type=str)
    args = parser.parse_args()

    setup_project(args)
