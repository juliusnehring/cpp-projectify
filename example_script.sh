#!/bin/bash
project_name="MyProject"
project_folder_name="my_project"
source_folder_name="src"
is_libary=false

# https://www.graphics.rwth-aachen.de:9000/ptrettner/typed-geometry.git
# https://www.graphics.rwth-aachen.de:9000/ptrettner/ctracer.git
# https://www.graphics.rwth-aachen.de:9000/ptrettner/polymesh.git
# https://www.graphics.rwth-aachen.de:9000/Glow/glow-extras.git
# https://www.graphics.rwth-aachen.de:9000/Glow/glow.git

submodule_urls=(
    "https://www.graphics.rwth-aachen.de:9000/ptrettner/typed-geometry.git"
    "https://www.graphics.rwth-aachen.de:9000/ptrettner/ctracer.git"
    )
submodule_names=(
    "typed-geometry"
    "ctracer"
)

# takes a path to where main should lie
function make_main
{
    echo "#include <iostream>" > $1
    echo "" >> $1
    echo "int main(int /* argc */, char * /* argv */ [])" >> $1
    echo "{" >> $1
    echo "    std::cout << \"Hello World\" << std::endl;" >> $1
    echo "}" >> $1
}

function make_cmakelists 
{
    # header
    echo cmake_minimum_required\(VERSION 3.8\) > $1
    echo project\($project_name\) >> $1
    echo >> $1
    echo \# =============================================== >> $1
    echo \# Global settings >> $1
    echo >> $1
    echo set\(CMAKE_CXX_STANDARD 17\) >> $1
    echo set\(CMAKE_CXX_STANDARD_REQUIRED ON\) >> $1
    echo >> $1

    echo \# =============================================== >> $1
    echo \# add submodules >> $1
    for name in ${submodule_names[*]}; do
        echo add_subdirectory\(extern/$name\) >> $1
    done

    echo >> $1
    echo \# =============================================== >> $1
    echo \# Configure executable >> $1

    # do evil glob
    echo file\(GLOB_RECURSE SOURCES >> $1
    echo "    " \"src/*.cc\" >> $1
    echo "    " \"src/*.hh\" >> $1
    echo "    " \"src/*.cpp\" >> $1
    echo "    " \"src/*.h\" >> $1
    echo \) >> $1
    echo >> $1
    
    echo \# group sources according to folder structure >> $1
    echo source_group\(TREE \${CMAKE_CURRENT_SOURCE_DIR} FILES \${SOURCES}\) >> $1
    echo >> $1
    
    echo \# =============================================== >> $1
    echo >> $1 \# Make executable
    echo add_executable\(\${PROJECT_NAME} \${SOURCES}\) >> $1
    echo >> $1

    echo \# =============================================== >> $1
    echo >> $1 \# Set link libraries
    echo target_link_libraries\(\${PROJECT_NAME} PUBLIC >> $1
    for name in ${submodule_names[*]}; do
        echo "    " $name >> $1
    done
    echo \) >> $1
    echo >> $1
    echo target_include_directories\(\${PROJECT_NAME} PUBLIC "src"\) >> $1
    echo >> $1

    echo \# =============================================== >> $1
    echo \# Compile flags >> $1
    echo if \(MSVC\) >> $1
    echo "    " target_compile_options\(\${PROJECT_NAME} PUBLIC >> $1
    echo "        " /MP >> $1
    echo "    " \) >> $1
    echo else\(\) >> $1
    echo "    " target_compile_options\(\${PROJECT_NAME} PUBLIC >> $1
    echo "        " -Wall >> $1
    echo "        " -Werror >> $1
    echo "        " -march=native >> $1
    echo "    " \) >> $1
    echo endif\(\) >> $1

    # todo: add test folder and executable

}

mkdir "$project_folder_name"
cd "$project_folder_name"

make_cmakelists "CMakeLists.txt"
touch "readme.md"
mkdir "extern"
mkdir "src"

if $is_libary; then
    mkdir "src/$project_folder_name"
    mkdir "test"
    make_main "test/main.cc"
else
    make_main "src/main.cc"
fi

git init

cd "extern"
for url in ${submodule_urls[*]}; do
    git submodule add $url
done
cd ..

git submodule update --init --recursive

# move back up
cd ..