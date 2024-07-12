import * as THREE from 'three'
import { useRef, useState } from 'react'
import { Canvas, extend, useThree, useFrame } from '@react-three/fiber'
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'

// In order to use the MeshLine library, which is vanilla Three.js in React,
// we need to extend it. The extend function extends React Three Fiber's 
// catalog of known JSX elements.

extend({ MeshLineGeometry, MeshLineMaterial })

export function IdCard() {

  // Setting up the band of the Id Card.
  const Band = () => {

    // Different components of the band
    // By having all of them be ref, we make sure that when they change the component is not RE-RENDERED.
    const band = useRef()
    const fixed = useRef()
    const joint1 = useRef()
    const joint2 = useRef()
    const joint3 = useRef()

    // Canvas size 
    const { width, height } = useThree((state) => state.size)

    // Catmull-Rom curve (interesting path curve while interaction)
    const [curve] = useState(() => new THREE.CatmullRomCurve3([
      new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
    ]))
  }

  return (
    <Canvas>
      <Physics>
        We will add Physics sim here
      </Physics>
    </Canvas>
  )
}