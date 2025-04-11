# build to dist
npm run build-nolog 

# make version commits file
(git rev-list --count HEAD) > dist/version.txt 

# export all docs
./tools/docs_collector/docs_collector