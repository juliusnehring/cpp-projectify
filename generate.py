import argparse
import urllib.request
import json
import os.path
from subprocess import call
from pathlib import Path
import sys


class Library(object):
    def __init__(self, data):
        self.__dict__ = data

    def depends_on(self, other):
        return other.name in self.dependencies

    def has_addon_for(self, other):
        return other.name in self.addons

def load_libraries(origin_url: str):
    with urllib.request.urlopen(origin_url + "libraries.json") as url:
        data = json.loads(url.read().decode())
        libraries = []
        for lib in data["libraries"]:
            libraries.append(Library(lib))
        return libraries


def create_main(filepath: str, enabled_libraries):
    has_glow_extras = any(lib.name == "glow-extras" for lib in enabled_libraries)
    has_nexus = any(lib.name == "nexus" for lib in enabled_libraries)
    with open(filepath, "w") as f:
        f.write("#include <cstdio>\n\n")
        if(has_nexus):
            f.write("#include <nexus/run.hh>\n\n")

        if(has_glow_extras):
            f.write("#include <glow-extras/glfw/GlfwContext.hh>\n\n")

        if has_nexus:
            f.write("int main(int argc, char** args)\n")
        else:
            f.write("int main(int /*argc*/, char** /*args*/)\n")
        f.write("{\n")

        f.write('    printf("application main\\n");\n')

        if has_glow_extras:
            f.write("\n    glow::glfw::GlfwContext ctx;\n")
        
        if has_nexus:
            f.write("    return nx::run(argc, args);\n")

        f.write("}\n")

def create_cmakelists(filepath, project_name: str, flags_linux: str, flags_msvc: str, enabled_libraries):
    with open(filepath, "w") as f:

        project_caps_prefix = project_name[0:3].upper()

        # glow needs a special bin dir
        if any(lib.name == "glow" for lib in enabled_libraries):
            glow_bin_dir = "set(GLOW_BIN_DIR ${CMAKE_SOURCE_DIR}/bin)\n"
        else:
            glow_bin_dir = ""

        # disable some annoying glfw defaults
        if(any(lib.name == "glfw" for lib in enabled_libraries)):
            glfw_configuration = (
                "# ===============================================\n"
                "# disable glfw additionals\n"
                "option(GLFW_BUILD_EXAMPLES "" OFF)\n"
                "option(GLFW_BUILD_TESTS "" OFF)\n"
                "option(GLFW_BUILD_DOCS "" OFF)\n"
                "option(GLFW_INSTALL "" OFF)\n")
        else:
            glfw_configuration = ""

        subdirectories = ""
        for lib in enabled_libraries:
            subdirectories += 'add_subdirectory(extern/' + lib.name + ')\n'

        link_libraries = ""
        for lib in enabled_libraries:
            link_libraries += "    " + lib.name + "\n"

        f.write(
            """
cmake_minimum_required(VERSION 3.8)
project({project_name})

# ===============================================
# global settings

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set_property(GLOBAL PROPERTY USE_FOLDERS ON)

# ===============================================
# options

option({project_caps_prefix}_ENABLE_ASAN "if true, enables clang/MSVC address sanitizer" OFF)
option({project_caps_prefix}_ENABLE_MSAN "if true, enables clang/MSVC memory sanitizer" OFF)
option({project_caps_prefix}_ENABLE_UBSAN "if true, enables clang/MSVC undefined behaviour sanitizer" OFF)
option({project_caps_prefix}_ENABLE_TSAN "if true, enables clang/MSVC thread sanitizer" OFF)

if ({project_caps_prefix}_ENABLE_ASAN AND {project_caps_prefix}_ENABLE_TSAN)
    message(FATAL_ERROR "Can only enable one of TSan or ASan at a time")
endif()
if ({project_caps_prefix}_ENABLE_ASAN AND {project_caps_prefix}_ENABLE_MSAN)
    message(FATAL_ERROR "Can only enable one of ASan or MSan at a time")
endif()

option({project_caps_prefix}_ENABLE_WERROR "if true, enables -Werror, /WX" OFF)


# ===============================================
# compiler and linker flags

set(COMMON_COMPILER_FLAGS "")
set(COMMON_LINKER_FLAGS "")

if (MSVC)
    list(APPEND COMMON_COMPILER_FLAGS {flags_msvc})

    if ({project_caps_prefix}_ENABLE_WERROR)
        list(APPEND COMMON_COMPILER_FLAGS /WX)
    endif()
else()
    list(APPEND COMMON_COMPILER_FLAGS {flags_linux})

    if ({project_caps_prefix}_ENABLE_WERROR)
        list(APPEND COMMON_COMPILER_FLAGS -Werror)
    endif()

    if ({project_caps_prefix}_ENABLE_ASAN OR {project_caps_prefix}_ENABLE_TSAN OR {project_caps_prefix}_ENABLE_MSAN OR {project_caps_prefix}_ENABLE_UBSAN)
        list(APPEND COMMON_COMPILER_FLAGS -fno-omit-frame-pointer -g)
        list(APPEND COMMON_LINKER_FLAGS -fno-omit-frame-pointer -g)
    endif()

    if ({project_caps_prefix}_ENABLE_ASAN)
        list(APPEND COMMON_COMPILER_FLAGS -fsanitize=address)
        list(APPEND COMMON_LINKER_FLAGS -fsanitize=address)
    endif()

    if ({project_caps_prefix}_ENABLE_TSAN)
        list(APPEND COMMON_COMPILER_FLAGS -fsanitize=thread)
        list(APPEND COMMON_LINKER_FLAGS -fsanitize=thread)
    endif()

    if ({project_caps_prefix}_ENABLE_MSAN)
        list(APPEND COMMON_COMPILER_FLAGS -fsanitize=memory)
        list(APPEND COMMON_LINKER_FLAGS -fsanitize=memory)
    endif()

    if ({project_caps_prefix}_ENABLE_UBSAN)
        list(APPEND COMMON_COMPILER_FLAGS
            -fsanitize=undefined
            -fno-sanitize-recover=all
            -fno-sanitize=alignment,vptr
        )
        list(APPEND COMMON_LINKER_FLAGS
            -fsanitize=undefined
            -fno-sanitize-recover=all
            -fno-sanitize=alignment,vptr
        )
    endif()
endif()

# ===============================================
# Bin dir
if(MSVC)
    set(BIN_DIR ${{CMAKE_SOURCE_DIR}}/bin)
elseif(CMAKE_BUILD_TYPE STREQUAL "")
    set(BIN_DIR ${{CMAKE_SOURCE_DIR}}/bin/Default)
else()
    set(BIN_DIR ${{CMAKE_SOURCE_DIR}}/bin/${{CMAKE_BUILD_TYPE}})
endif()
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${{BIN_DIR}})
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE ${{BIN_DIR}})
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELWITHDEBINFO ${{BIN_DIR}})
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG ${{BIN_DIR}})
{glow_bin_dir}
{glfw_configuration}

# ===============================================s
# add submodules
{subdirectories}

# ===============================================
# configure executable
file(GLOB_RECURSE SOURCES
    "src/*.cc"
    "src/*.hh"
    "src/*.cpp"
    "src/*.h"
)

# group sources according to folder structure
source_group(TREE ${{CMAKE_CURRENT_SOURCE_DIR}} FILES ${{SOURCES}})

# ===============================================
# add executable
add_executable(${{PROJECT_NAME}} ${{SOURCES}})
target_link_libraries(${{PROJECT_NAME}} PUBLIC
{link_libraries}
    ${{COMMON_LINKER_FLAGS}}
)

target_include_directories(${{PROJECT_NAME}} PUBLIC "src")
target_compile_options(${{PROJECT_NAME}} PUBLIC ${{COMMON_COMPILER_FLAGS}})

# dependency grouping in the IDE
foreach(TARGET_NAME
{link_libraries}
)
    set_property(TARGET ${{TARGET_NAME}} PROPERTY FOLDER "Extern")
endforeach()

""".format(
    project_name=project_name,
    project_caps_prefix=project_caps_prefix,
    flags_msvc=flags_msvc,
    flags_linux=flags_linux,
    glow_bin_dir=glow_bin_dir,
    glfw_configuration=glfw_configuration,
    subdirectories=subdirectories,
    link_libraries=link_libraries))


def sort_libraries(libraries):
    """Sort libraries according to their necessary include order"""
    for i in range(len(libraries)):
        for j in range(i, len(libraries)):
            if libraries[i].depends_on(libraries[j]) or libraries[i].has_addon_for(libraries[j]):
                tmp = libraries[i]
                libraries[i] = libraries[j]
                libraries[j] = tmp
    return libraries


def get_enabled_libs(args):
    all_libs = load_libraries(args.origin)
    lib_names = []
    if args.library is not None:
        lib_names += args.library
    if args.libraryssh is not None:
        lib_names += args.libraryssh
    return sort_libraries(list(filter(lambda lib: lib.name in lib_names, all_libs)))


def setup_project(args):
    project_name = args.name
    project_url = args.url
    origin_url = args.origin
    enabled_libs = get_enabled_libs(args)

    if(os.path.isdir(project_name)):
        print("Directory " + project_name + " already exists! Aborting!")
        return

    if(project_url):
        call(["git", "clone", project_url, project_name])
    else:
        print("No git repository given. Initializing git...")
        os.mkdir(project_name)
        call(["git", "-C", project_name, "init"])

    create_cmakelists(os.path.join(
        project_name, "CMakeLists.txt"), project_name, args.flags_linux, args.flags_msvc, enabled_libs)

    Path(os.path.join(project_name, "README.md")).touch()

    # Download files
    raw_data_download_url = origin_url
    if "github" in origin_url:
        # extract github raw domain
        github_username = origin_url.split("/")[2].split(".")[0]
        github_reponame = origin_url.split("/")[3]
        raw_data_download_url = "https://raw.githubusercontent.com/{}/{}/master".format(
            github_username, github_reponame)

    urllib.request.urlretrieve(
        raw_data_download_url + "/data/.clang-format", os.path.join(project_name, ".clang-format"))
    urllib.request.urlretrieve(
        raw_data_download_url + "/data/.gitignore", os.path.join(project_name, ".gitignore"))

    os.mkdir(os.path.join(project_name, "extern"))
    os.mkdir(os.path.join(project_name, "src"))
    os.mkdir(os.path.join(project_name, "bin"))

    create_main(os.path.join(project_name, 'src', 'main.cc'), enabled_libs)

    for lib in enabled_libs:
        extern_folder = os.path.join(project_name, "extern")

        # clone via https
        if args.library is not None and lib.name in args.library:
            success = call(["git", "-C", extern_folder, "submodule", "add", lib.git_url_https, lib.name])
            if success != 0:
                print("Failed to add submodule " + lib.name + " from " + lib.git_url_https, file=sys.stderr)
        
        # clone via ssh
        if args.libraryssh is not None and lib.name in args.libraryssh:
            success = call(["git", "-C", extern_folder, "submodule", "add", lib.git_url_ssh, lib.name])
            if success != 0:
                print("Failed to add submodule " + lib.name + " from " + lib.git_url_https, file=sys.stderr)
        
    call(["git", "-C", project_name, "submodule", "update", "--init", "--recursive"])

    print("DONE!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Create project with dependencies")
    parser.add_argument("--name", "-n", type=str, required=True)
    parser.add_argument("--origin", "-o", type=str, required=True)
    parser.add_argument("--flags_linux", "-l", type=str)
    parser.add_argument("--flags_msvc", "-m", type=str)
    parser.add_argument("--url", "-u", type=str)
    parser.add_argument("--library", "-lib", type=str, action='append')
    parser.add_argument("--libraryssh", "-libssh", type=str, action='append')
    args = parser.parse_args()

    setup_project(args)
