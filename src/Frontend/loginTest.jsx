import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  CheckBox,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    Alert.alert("Login", `Email: ${email}, Password: ${password}`);
  };

  const handleGoogleSignIn = () => {
    Alert.alert("Google Sign-In", "Coming soon!");
  };

  return (
    <SafeAreaView className="flex-1 justify-center items-center bg-gray-100 px-4">
      <View className="w-full max-w-md bg-white rounded-xl p-6 shadow">
        <Text className="text-gray-500 text-sm mb-1">Please enter your details</Text>
        <Text className="text-2xl font-bold mb-6">Welcome back</Text>

        {/* Email Input */}
        <TextInput
          className="border border-gray-300 rounded-md px-4 py-3 mb-4 text-base"
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        {/* Password Input */}
        <TextInput
          className="border border-gray-300 rounded-md px-4 py-3 mb-2 text-base"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Remember and Forgot password */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => setRememberMe(!rememberMe)}
          >
            <CheckBox
              value={rememberMe}
              onValueChange={setRememberMe}
              tintColors={{ true: "#3B82F6", false: "#aaa" }}
            />
            <Text className="ml-2 text-gray-600">Remember for 30 days</Text>
          </TouchableOpacity>
          <Text className="text-blue-600 text-sm">Forgot password</Text>
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity
          onPress={handleLogin}
          className="bg-blue-600 py-3 rounded-md mb-4"
        >
          <Text className="text-white text-center text-base font-medium">Sign up</Text>
        </TouchableOpacity>

        {/* Google Sign In */}
        <TouchableOpacity
          onPress={handleGoogleSignIn}
          className="border border-gray-300 py-3 rounded-md flex-row justify-center items-center"
        >
          <FontAwesome name="google" size={20} color="black" />
          <Text className="ml-2 text-base text-black">Sign in with Google</Text>
        </TouchableOpacity>

        {/* Bottom Link */}
        <Text className="text-center text-sm text-gray-500 mt-6">
          Don’t have an account?{" "}
          <Text className="text-blue-600 font-medium">Sign up</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
