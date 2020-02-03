import argparse
import urllib.request
import json
import os.path
from subprocess import call
from pathlib import Path


class Library(object):
    def __init__(self, data):
        self.__dict__ = data


def load_libraries(origin_url : str):
    with urllib.request.urlopen(origin_url + "libraries.json") as url:
        data = json.loads(url.read().decode())
        libraries = []
        for lib in data["libraries"]:
            libraries.append(Library(lib))
        return libraries


def create_main(filepath):
    with open(filepath, "w") as f:
        f.write('#include <cstdio>\n\n')
        f.write('int main()\n')
        f.write('{\n')
        f.write('    printf("application main\\n");\n')
        f.write('    return 0;\n')
        f.write('}\n')


def create_cmakelists(filepath, project_name : str, enabled_libraries):
    with open(filepath, "w") as f:
        
        project_caps_prefix = project_name[0:3].upper()

        # HEADER
        f.write('cmake_minimum_required(VERSION 3.8)\n')
        f.write('project(' + project_name + ')\n\n')
        f.write("""
# ===============================================
# global settings

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set_property(GLOBAL PROPERTY USE_FOLDERS ON)

# ===============================================
# options

option({0}_ENABLE_ASAN "if true, enables clang/MSVC address sanitizer" OFF)
option({0}_ENABLE_MSAN "if true, enables clang/MSVC memory sanitizer" OFF)
option({0}_ENABLE_UBSAN "if true, enables clang/MSVC undefined behaviour sanitizer" OFF)
option({0}_ENABLE_TSAN "if true, enables clang/MSVC thread sanitizer" OFF)

if ({0}_ENABLE_ASAN AND {0}_ENABLE_TSAN)
    message(FATAL_ERROR "Can only enable one of TSan or ASan at a time")
endif()
if ({0}_ENABLE_ASAN AND {0}_ENABLE_MSAN)
    message(FATAL_ERROR "Can only enable one of ASan or MSan at a time")
endif()

option({0}_ENABLE_WERROR "if true, enables -Werror, /WX" OFF)


# ===============================================
# compiler and linker flags

set(COMMON_COMPILER_FLAGS "")
set(COMMON_LINKER_FLAGS "")

if (MSVC)
    list(APPEND COMMON_COMPILER_FLAGS
        /MP
    )

    if ({0}_ENABLE_WERROR)
        list(APPEND COMMON_COMPILER_FLAGS /WX)
    endif()
else()
    list(APPEND COMMON_COMPILER_FLAGS
        -Wall
        -Wextra
        -Wno-unused-variable
    )

    if ({0}_ENABLE_WERROR)
        list(APPEND COMMON_COMPILER_FLAGS -Werror)
    endif()

    if ({0}_ENABLE_ASAN OR {0}_ENABLE_TSAN OR {0}_ENABLE_MSAN OR {0}_ENABLE_UBSAN)
        list(APPEND COMMON_COMPILER_FLAGS -fno-omit-frame-pointer -g)
        list(APPEND COMMON_LINKER_FLAGS -fno-omit-frame-pointer -g)
    endif()

    if ({0}_ENABLE_ASAN)
        list(APPEND COMMON_COMPILER_FLAGS -fsanitize=address)
        list(APPEND COMMON_LINKER_FLAGS -fsanitize=address)
    endif()

    if ({0}_ENABLE_TSAN)
        list(APPEND COMMON_COMPILER_FLAGS -fsanitize=thread)
        list(APPEND COMMON_LINKER_FLAGS -fsanitize=thread)
    endif()

    if ({0}_ENABLE_MSAN)
        list(APPEND COMMON_COMPILER_FLAGS -fsanitize=memory)
        list(APPEND COMMON_LINKER_FLAGS -fsanitize=memory)
    endif()

    if ({0}_ENABLE_UBSAN)
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

        """.format(project_caps_prefix))
        f.write('\n')
        f.write('# ===============================================\n')
        f.write('# Bin dir\n')
        f.write('if(MSVC)\n')
        f.write('    set(BIN_DIR ${CMAKE_SOURCE_DIR}/bin)\n')
        f.write('elseif(CMAKE_BUILD_TYPE STREQUAL "")\n')
        f.write('    set(BIN_DIR ${CMAKE_SOURCE_DIR}/bin/Default)\n')
        f.write('else()\n')
        f.write(
            '    set(BIN_DIR ${CMAKE_SOURCE_DIR}/bin/${CMAKE_BUILD_TYPE})\n')
        f.write('endif()\n')
        f.write('set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${BIN_DIR})\n')
        f.write('set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE ${BIN_DIR})\n')
        f.write(
            'set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELWITHDEBINFO ${BIN_DIR})\n')
        f.write('set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG ${BIN_DIR})\n')

        # GLOW needs a special bin directory
        if any(lib.name == "glow" for lib in enabled_libraries):
            f.write("set(GLOW_BIN_DIR ${CMAKE_SOURCE_DIR}/bin)\n")

        # GLFW is annoying
        if(any(lib.name == "glfw" for lib in enabled_libraries)):
            f.write("\n")
            f.write('# ===============================================\n')
            f.write('# disable glfw additionals\n')
            f.write('option(GLFW_BUILD_EXAMPLES "" OFF)\n')
            f.write('option(GLFW_BUILD_TESTS "" OFF)\n')
            f.write('option(GLFW_BUILD_DOCS "" OFF)\n')
            f.write('option(GLFW_INSTALL "" OFF)\n')

        # Add the submodules
        f.write("\n")
        f.write("# ===============================================\n")
        f.write("# add submodules\n")
        for lib in enabled_libraries:
            f.write('add_subdirectory(extern/' + lib.name + ')\n')

        f.write('\n')
        f.write('# ===============================================\n')
        f.write('# configure executable\n')
        f.write('\n')
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
        f.write('# add executable\n\n')
        f.write('add_executable(${PROJECT_NAME} ${SOURCES})\n')
        f.write('target_link_libraries(${PROJECT_NAME} PUBLIC\n')
        for lib in enabled_libraries:
            f.write("    " + lib.name + "\n")
        f.write("    ${COMMON_LINKER_FLAGS}\n")
        f.write(')\n')
        f.write('target_include_directories(${PROJECT_NAME} PUBLIC "src")\n')
        f.write('target_compile_options(${PROJECT_NAME} PUBLIC ${COMMON_COMPILER_FLAGS})')


def get_enabled_libs(args):
    all_libs = load_libraries(args.origin)
    return list(filter(lambda lib: lib.name in args.libraries, all_libs))


def setup_project(args):
    project_name = args.name
    project_url = args.url
    enabled_libs = get_enabled_libs(args)
    origin_url = args.origin

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
        project_name, "CMakeLists.txt"), project_name, enabled_libs)

    Path(os.path.join(project_name, "README.md")).touch()

    # Download files
    urllib.request.urlretrieve(
        origin_url + "/data/.clang-format", os.path.join(project_name, ".clang-format"))
    urllib.request.urlretrieve(
        origin_url + "/data/.gitignore", os.path.join(project_name, ".gitignore"))

    os.mkdir(os.path.join(project_name, "extern"))
    os.mkdir(os.path.join(project_name, "src"))
    os.mkdir(os.path.join(project_name, "bin"))

    create_main(os.path.join(project_name, 'src', 'main.cc'))

    for lib in enabled_libs:
        call(["git", "-C", os.path.join(project_name,
                                        "extern"), "submodule", "add", lib.git_url, lib.name])

    call(["git", "-C", project_name, "submodule",
          "update", "--init", "--recursive"])

    print("DONE!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Create project with dependencies")
    parser.add_argument("--name", "-n", type=str, required=True)
    parser.add_argument("--origin", "-o", type=str, required=True)
    parser.add_argument("--url", "-u", type=str)
    parser.add_argument("libraries", nargs='*', type=str)
    args = parser.parse_args()

    setup_project(args)
