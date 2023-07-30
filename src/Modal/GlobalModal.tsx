import React, { useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Modal, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, interpolate, Layout, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import ChildWrapper from './ChildWrapper';

const SHOW_GLOBAL_MODAL = 'show_global_modal';
const HIDE_GLOBAL_MODAL = "hide_global_modal"

export type GlobalModalProps = {
  skipQueue?: boolean;
  modalKey?: string,
  hideClose?: boolean,
  Component: React.FC
};

export function showGlobalModal(prop: GlobalModalProps) {
  DeviceEventEmitter.emit(SHOW_GLOBAL_MODAL, prop);
}

export function hideGlobalModal(key: string) {
  DeviceEventEmitter.emit(HIDE_GLOBAL_MODAL, key)
}

function GlobalModal() {
  const opacityValue = useSharedValue(0)
  const backdropOpacityStyle = useAnimatedStyle(() => {
    return { opacity: interpolate(opacityValue.value, [0, 1], [0, 0.5]) }
  })
  const containerOpacityStyle = useAnimatedStyle(() => {
    return { opacity: opacityValue.value }
  })

  const [modalProps, setModalProps] = useState<GlobalModalProps[]>([]);
  const [modalVisible, setModalVisible] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const isFirstModalRef = useRef<boolean>()

  useEffect(() => {
    const showSub = DeviceEventEmitter.addListener(
      SHOW_GLOBAL_MODAL,
      (prop: GlobalModalProps) => {
        setModalProps((oldProps) => {
          isFirstModalRef.current = oldProps.length === 0
          setIsVisible(true)
          return [
            ...oldProps.filter((it) => !it.skipQueue),
            { ...prop, modalKey: prop.modalKey ?? Date.now().toString() },
          ]
        });
      }
    );
    const hideSub = DeviceEventEmitter.addListener(HIDE_GLOBAL_MODAL, (key: string) => {
      setModalProps((oldProps) => {
        if (oldProps.length === 1) {
          setIsVisible(false)
          return oldProps
        }
        return oldProps.filter((it) => it.modalKey !== key)
      })
    })
    return () => {
      showSub.remove();
      hideSub.remove()
    };
  }, []);


  const closeModal = () => {
    setModalProps((oldProps) => {
      if (oldProps.length === 1) {
        setIsVisible(false)
        return oldProps
      }
      return oldProps.slice(0, -1)
    });
  }

  const hideModal = () => {
    setModalVisible(false)
    setModalProps([])
  }

  useEffect(() => {
    if (isVisible) {
      setModalVisible(true)
      opacityValue.value = withTiming(1, {
        duration: 250,
        easing: Easing.ease,
      })
    } else {
      opacityValue.value = withTiming(0, {
        duration: 300,
        easing: Easing.linear,
      }, (finished) => {
        if (finished) {
          runOnJS(hideModal)()
        }
      })
    }
  }, [isVisible])

  return (
    <Modal
      animationType='none'
      transparent
      visible={modalVisible}
      onRequestClose={closeModal}
    >
      <Animated.View style={[styles.backdrop, backdropOpacityStyle]}></Animated.View>
      <Animated.View style={[styles.centeredView, containerOpacityStyle]}>
        <Animated.View style={styles.modalView} layout={Layout.delay(250).duration(250)}>
          {modalProps.map((it, index) => (
            <ChildWrapper key={it.modalKey} isFirst={modalProps.length === 1} isEnabled={index === modalProps.length - 1} hideClose={it.hideClose} onClosePress={closeModal}>
              <it.Component />
            </ChildWrapper>
          ))}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0,
    backgroundColor: 'black',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
});

export default GlobalModal;
