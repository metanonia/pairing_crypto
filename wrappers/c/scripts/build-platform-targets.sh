# The following script simplifies the complex process of building
# `pairing_crypto_c` for different targets, instead of dealing in
# individual rust targets e.g x86_64 the script takes the plaform
# e.g IOS and takes care of all required targets for the target
# platform

# TODO need to check that rust is installed

set -e

PLATFORM=$1
OUTPUT_LOCATION=$2

PROJECT_NAME=pairing_crypto_c
INPUT_FILE="libpairing_crypto_c"
OUTPUT_FILE="libpairing_crypto_c"

SCRIPT_DIRECTORY="$(dirname -- "${BASH_SOURCE}")"
ROOT_DIRECTORY=$( cd "$SCRIPT_DIRECTORY/../../.." && pwd )

if [ -z "$PLATFORM" ]
then
  echo "ERROR: PLATFORM argument must be supplied and must be one of the following: IOS"
  exit 1
fi

if [ -z "$OUTPUT_LOCATION" ]
then
  echo "ERROR: OUTPUT_LOCATION argument must be supplied and be a valid directory"
  exit 1
fi

echo "Building for PLATFORM: $1"
echo "To OUTPUT_DIRECTORY: $OUTPUT_LOCATION"

case $PLATFORM in
  IOS)
      # Set deployment target to resolve ___chkstk_darwin issues on newer SDKs
      export IPHONEOS_DEPLOYMENT_TARGET=13.0

      # Create the root directory for the IOS release binaries
      mkdir -p $OUTPUT_LOCATION/ios

      # Create the directories at the output location for the release binaries
      mkdir -p $OUTPUT_LOCATION/ios/x86_64
      mkdir -p $OUTPUT_LOCATION/ios/aarch64
      mkdir -p $OUTPUT_LOCATION/ios/universal

      rustup target install x86_64-apple-ios aarch64-apple-ios
      
      echo "Building for aarch64-apple-ios..."
      cargo build -p $PROJECT_NAME --target aarch64-apple-ios --release
      
      echo "Building for x86_64-apple-ios (Simulator)..."
      cargo build -p $PROJECT_NAME --target x86_64-apple-ios --release

      echo "Creating universal library using lipo..."
      cp "$ROOT_DIRECTORY/target/aarch64-apple-ios/release/$INPUT_FILE.a" "$OUTPUT_LOCATION/ios/aarch64/$OUTPUT_FILE.a"
      cp "$ROOT_DIRECTORY/target/x86_64-apple-ios/release/$INPUT_FILE.a" "$OUTPUT_LOCATION/ios/x86_64/$OUTPUT_FILE.a"
      
      lipo -create \
        "$ROOT_DIRECTORY/target/aarch64-apple-ios/release/$INPUT_FILE.a" \
        "$ROOT_DIRECTORY/target/x86_64-apple-ios/release/$INPUT_FILE.a" \
        -output "$OUTPUT_LOCATION/ios/universal/$OUTPUT_FILE.a"
    ;;
    MACOS)
      # Create the root directory for the macos release binaries
      mkdir -p $OUTPUT_LOCATION/macos

      # Create the directories at the output location for the release binaries
      mkdir -p $OUTPUT_LOCATION/macos/darwin-x86_64/

      # Install cargo-lipo
      # see https://github.com/TimNN/cargo-lipo
      # cargo install cargo-lipo
      rustup target install x86_64-apple-darwin
      # Works on macos host
      cargo build -p $PROJECT_NAME --target x86_64-apple-darwin --release
      # cargo lipo -p $PROJECT_NAME --release
      cp "$SCRIPT_DIRECTORY/../../../target/x86_64-apple-darwin/release/$INPUT_FILE.a" "$OUTPUT_LOCATION/macos/darwin-x86_64/$OUTPUT_FILE.a"
    ;;
  ANDROID)
      # Create the root directory for the Android release binaries
      mkdir -p $OUTPUT_LOCATION/android

      # Define Android targets
      ANDROID_TARGETS=("aarch64-linux-android" "armv7-linux-androideabi" "i686-linux-android" "x86_64-linux-android")
      NDK_ABIS=("arm64-v8a" "armeabi-v7a" "x86" "x86_64")

      # Install cargo-ndk
      # see https://github.com/bbqsrc/cargo-ndk
      if ! command -v cargo-ndk &> /dev/null
      then
          echo "cargo-ndk could not be found, installing..."
          cargo install cargo-ndk
      fi

      for i in "${!ANDROID_TARGETS[@]}"; do
        TARGET=${ANDROID_TARGETS[$i]}
        ABI=${NDK_ABIS[$i]}
        
        echo "Building for $TARGET ($ABI)..."
        rustup target install $TARGET
        cargo ndk -t $TARGET build -p $PROJECT_NAME --release
        
        mkdir -p "$OUTPUT_LOCATION/android/$ABI"
        cp "$ROOT_DIRECTORY/target/$TARGET/release/$INPUT_FILE.so" "$OUTPUT_LOCATION/android/$ABI/$OUTPUT_FILE.so"
      done
    ;;
  *)
    echo "ERROR: PLATFORM unknown: $1"
    exit 1
    ;;
esac
