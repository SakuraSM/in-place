FROM node:20-bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

RUN apt-get update && apt-get install -y --fix-missing \
  openjdk-17-jdk \
  unzip \
  wget \
  curl \
  git \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p $ANDROID_SDK_ROOT/cmdline-tools

RUN wget -O /tmp/cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip && \
  unzip /tmp/cmdline-tools.zip -d /tmp/cmdline-tools && \
  mkdir -p $ANDROID_SDK_ROOT/cmdline-tools/latest && \
  mv /tmp/cmdline-tools/cmdline-tools/* $ANDROID_SDK_ROOT/cmdline-tools/latest/ && \
  rm -rf /tmp/cmdline-tools /tmp/cmdline-tools.zip

RUN JAVA_BIN=$(readlink -f $(which javac)) && \
    export JAVA_HOME=$(dirname $(dirname "$JAVA_BIN")) && \
    export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH && \
    java -version && \
    javac -version && \
    yes | sdkmanager --licenses && \
    sdkmanager \
      "platform-tools" \
      "platforms;android-35" \
      "build-tools;35.0.0"

WORKDIR /workspace
